// Mock mode: serves responses built from the generated fixtures (engine + verified templates + demo cohort).
// Nothing here computes a risk figure; every number comes from lib/fixtures/data.json. State survives reloads (sessionStorage).
import { DATA, conditionLabel, scenarioById, type Scenario } from "./fixtures";

const day = 86400;
type Consent = { id: string; grantee_id: string; scope: string; purpose: string; expires_at: number; revoked_at: number | null };
type Step = { state: string; owner_id: string; due_at: number; overdue?: boolean };
type State = { persona: string; scenario: string; pooled: { a: boolean; b: boolean }; released: boolean; attempts: number; passed: boolean;
  consents: Consent[]; invited: boolean; accepted: boolean; steps: Step[]; offset: number; counselling: boolean };

const FRESH = (): State => ({ persona: "", scenario: "s3", pooled: { a: false, b: false }, released: false, attempts: 0, passed: false,
  consents: [], invited: false, accepted: false, steps: [], offset: 0, counselling: false });
const load = (): State => {
  try { const raw = typeof sessionStorage !== "undefined" && sessionStorage.getItem("ks_mock"); if (raw) return { ...FRESH(), ...JSON.parse(raw) }; } catch { /* private mode */ }
  return FRESH();
};
let S: State = load();
const save = () => { try { sessionStorage.setItem("ks_mock", JSON.stringify(S)); } catch { /* private mode */ } };
const now = () => Math.floor(Date.now() / 1000) + S.offset * day;
const sc = (): Scenario => scenarioById(S.scenario);
const shown = (s: Scenario) => s.findings.filter((f) => f.formula_id !== "ar_both_not_detected"); // residual figures are summarised in text
const label = (id: string) => ({ label: conditionLabel(id, "en"), label_ar: conditionLabel(id, "ar") });
const needsCounsellor = () => sc().tier === 3;
const ensureReleased = () => { if (!needsCounsellor() && S.pooled.a && S.pooled.b) S.released = true; };

export const mock = {
  scenarios: () => DATA.scenarios.map((s) => ({ id: s.id, title: s.title, blurb: s.blurb, tier: s.tier, related: s.related })),
  scenario: () => S.scenario,
  setScenario(id: string) { S = { ...FRESH(), persona: S.persona, scenario: id }; save(); },
  async login(p: string) { S.persona = p; save(); return p; },
  async results() {
    const s = sc();
    const rows = S.persona === "person_b" ? s.results_b : s.results_a;
    return rows.map((r) => ({ ...r, ...label(r.condition_id) }));
  },
  async explanation(lang: string, level: string) {
    const s = sc();
    return { blocks: s.explanations[`${lang}/${level}`] ?? s.explanations["en/standard"], released: true };
  },
  async couple() {
    const s = sc();
    if (!(S.pooled.a && S.pooled.b)) return { tier: null, awaiting_counsellor: false, findings: null };
    ensureReleased();
    if (!S.released) return { tier: s.tier, awaiting_counsellor: true, findings: null };
    return { tier: s.tier, awaiting_counsellor: false, related: s.related,
      findings: shown(s).map((f) => ({ ...f, ...label(f.condition_id), risk_affected: f.risk_affected })) };
  },
  async grantPooling() {
    if (S.persona === "person_b") S.pooled.b = true; else S.pooled.a = true;
    if (!S.consents.find((c) => c.scope === "couple_pooling" && !c.revoked_at))
      S.consents.push({ id: `c${S.consents.length + 1}`, grantee_id: "your partner", scope: "couple_pooling", purpose: "couple_planning", expires_at: now() + 90 * day, revoked_at: null });
    ensureReleased(); save();
    return {};
  },
  async consents() { return S.consents; },
  async revoke(id: string) {
    const c = S.consents.find((x) => x.id === id);
    if (c) { c.revoked_at = now(); if (c.scope === "couple_pooling") S.pooled = { a: false, b: false }; if (c.scope === "couple_tier_only") S.accepted = false; }
    save();
    return {};
  },
  async quiz(lang: string) {
    const q = sc().quiz[lang === "ar" ? "ar" : "en"];
    return { questions: q.map(({ id, text, options }) => ({ id, text, options })) };
  },
  async submitQuiz(answers: Record<string, string>) {
    S.attempts += 1;
    const key = Object.fromEntries(sc().quiz.en.map((q) => [q.id, q.answer]));
    const ok = Object.entries(key).every(([id, a]) => answers[id] === a);
    if (ok) { S.passed = true; if (!S.steps.length) S.steps.push({ state: "result_released", owner_id: "user", due_at: now() + 7 * day }); save(); return { passed: true }; }
    save();
    return S.attempts >= 2 ? { passed: false, counsellor_offered: true } : { passed: false, reexplain: true };
  },
  async pedigree() {
    const P = (id: string, sex: "male" | "female", gen: number, col: number, parents?: [string, string], confirmed = true) => ({ id, sex, gen, col, confirmed, parents });
    const related = sc().related;
    const people = related
      ? [P("GF", "male", 0, 2), P("GM", "female", 0, 3), P("P1", "male", 1, 0, ["GF", "GM"]), P("S1", "female", 1, 1), P("P2", "female", 1, 4, ["GF", "GM"]),
         P("S2", "male", 1, 5), P("A", "male", 2, 0.5, ["P1", "S1"]), P("B", "female", 2, 4.5, ["S2", "P2"])]
      : [P("A", "male", 0, 1), P("B", "female", 0, 2)];
    if (S.invited) people.push(P("R1", "female", related ? 2 : 1, related ? 2.5 : 1.5, undefined, S.accepted));
    const partner = (a: string, b: string) => ({ a_id: a, b_id: b, type: "partner_of" as const, confidence: "known" as const });
    return { people, related: related ? ([["A", "B"]] as [string, string][]) : [],
      relationships: related ? [partner("GF", "GM"), partner("P1", "S1"), partner("S2", "P2"), partner("A", "B")] : [partner("A", "B")], warnings: [] };
  },
  async invite(kind: string) {
    S.invited = true;
    if (kind !== "decline") { S.accepted = true; S.consents.push({ id: `c${S.consents.length + 1}`, grantee_id: "relative", scope: "couple_tier_only", purpose: "family_notification", expires_at: now() + 30 * day, revoked_at: null }); }
    save();
    return {};
  },
  async referral() { return S.steps.map((s) => ({ ...s, overdue: s.due_at < now() })); },
  async copilot(text: string) {
    const refuse = /partner|husband|wife|raw|other|his|her|should we|decide|marry|شريك|زوج/i.test(text);
    return refuse ? { text: "", refused: true } : { text: "Your result says what was found for you. Being a carrier is not the same as having the condition. (Source: your explanation.)", refused: false };
  },
  async queue() {
    const demo = { id: "demo-case", tier: sc().tier, status: S.released ? "released" : needsCounsellor() ? "awaiting_counsellor" : "awaiting_user", due_at: now() + 3 * day,
      due_days: 3, language: "en", reading_level: "standard", age_band: "25-29", related: sc().related, conditions: shown(sc()).length, step: "result_released" };
    return [demo, ...DATA.queue.map((q) => ({ ...q, due_at: now() + q.due_days * day }))];
  },
  async brief(id: string) {
    if (id === "demo-case") { const s = sc(); return [`tier_${s.tier}`, ...shown(s).map((f) => `finding_${f.condition_id}`), ...(s.related ? ["related_partners"] : []), "quiz", "open"]; }
    const q = DATA.queue.find((x) => x.id === id);
    return [`tier_${q?.tier ?? 2}`, ...(q?.related ? ["related_partners"] : []), "quiz", "open"];
  },
  async decide(_case: string, d: string) { if (d === "approve" || d === "edit") { S.released = true; save(); } return {}; },
  async referralEvent(_case: string, event: string, evidence: string) {
    if (event === "closed" && !evidence) throw new Error("evidence");
    S.steps.push({ state: event, owner_id: "counsellor", due_at: now() + 14 * day });
    if (event === "counselling_requested") S.counselling = true;
    save();
    return {};
  },
  async dashboard() {
    const t = DATA.cohort.tiers;
    return { cells: { tier_1: t["1"], tier_2: t["2"], tier_3: t["3"], small_group: null }, budget_remaining: 1.5 };
  },
  async comprehension() { return DATA.comprehension; },
  async capacity() { return DATA.capacity; },
  async insights() { return DATA; },
  async auditVerify(tamper: boolean) { return { valid: !tamper }; },
  async policy() { return { rules: ["Default deny", "Consent required for every read", "No export route", "No employment, insurance or commercial purpose"] }; },
  async sources() { return [{ source: "Synthetic cohort", licence: "Project", kind: "synthetic" }, { source: "configs/panel.yaml", licence: "Project", kind: "synthetic" }]; },
  async accessLog() {
    const rows: [number, string, string, string][] = [
      [0, "you", "viewed your result", "allowed"], [0, "your partner", "asked for the couple view", "denied until you both agree"],
      [1, "counsellor", "opened the case brief", "allowed (assigned, with your consent)"], [2, "analyst", "tried to read a person-level row", "denied (aggregates only)"],
      [3, "you", "agreed to share for couple planning", "recorded"], [4, "relative", "asked to see pedigree details", "denied (invitation scope: relationship only)"],
      [6, "auditor", "verified the audit chain", "allowed (no content visible)"], [9, "demo operator", "reset the demo", "allowed"],
    ];
    return rows.map(([d, who, what, outcome]) => ({ when: now() - d * day, who, what, outcome }));
  },
  advance(days: number) { S.offset += days; save(); },
  reset() { S = { ...FRESH(), persona: S.persona }; save(); },
};
