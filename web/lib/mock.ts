// Fixtures for mock mode. They mimic API responses for the fictional related couple; they are NOT computed here.
// Wording mirrors the approved-template style; Arabic strings are placeholders pending native review.
const day = 86400;
const now = () => Math.floor(Date.now() / 1000) + offset;
let offset = 0; // "fast-forward a timer" in the demo

const S = {
  persona: "",
  pooled: { a: false, b: false },
  released: false,
  attempts: 0,
  passed: false,
  consents: [] as { id: string; grantee_id: string; scope: string; purpose: string; expires_at: number; revoked_at: number | null }[],
  invited: false,
  accepted: false,
  steps: [] as { state: string; owner_id: string; due_at: number; overdue?: boolean }[],
  tamper: false,
};

const EXPL: Record<string, Record<string, string[]>> = {
  en: {
    standard: [
      "All people and results shown here are fictional.",
      "Both of you carry a change in the same gene linked to Inherited blood disorder 01 (illustrative). In each pregnancy there is a 25% chance that a child is affected.",
      "You are related, and relatedness can raise the chance for some conditions.",
      "These figures are estimates. A chance of this kind is not a diagnosis.",
      "Being a carrier is not the same as having the condition.",
      "A qualified counsellor will review this result with you before it is final.",
    ],
    basic: [
      "All people and results here are made up.",
      "You both carry a change in the same gene. Each pregnancy has a 25% chance that a child is affected.",
      "Being a carrier is not the same as having the condition.",
      "A counsellor will review this result with you before it is final.",
    ],
  },
  ar: {
    standard: [
      "جميع الأشخاص والنتائج المعروضة هنا خيالية.",
      "كلاكما يحمل تغيرا في الجين نفسه المرتبط بحالة وراثية في الدم 01 (توضيحي). في كل حمل توجد فرصة بنسبة 25% أن يكون الطفل متأثرا.",
      "بينكما قرابة، والقرابة قد ترفع الفرصة في بعض الحالات.",
      "أن تكون حاملا لا يعني أنك مصاب بالحالة.",
      "سيراجع مستشار مؤهل هذه النتيجة معكما قبل أن تصبح نهائية.",
    ],
    basic: [
      "كل الأشخاص والنتائج هنا خيالية.",
      "كلاكما يحمل تغيرا في الجين نفسه. في كل حمل فرصة 25% أن يتأثر الطفل.",
      "الحامل ليس مصابا بالحالة.",
      "سيراجع مستشار هذه النتيجة معكما قبل أن تصبح نهائية.",
    ],
  },
};

const QUIZ = {
  en: [
    ["q1", "Does being a carrier mean a person has the condition?", ["No, a carrier is not the same as having the condition", "Yes, always"]],
    ["q2", "If a chance is shown, does it mean a child will definitely be affected?", ["No, it is a chance, not a certainty", "Yes, it will happen"]],
    ["q3", "Who decides what to do next?", ["You decide, with support if you want it", "A counsellor decides for you", "Your family decides for you"]],
    ["q4", "Can you ask to talk with a genetic counsellor at any time?", ["Yes", "No, only once"]],
    ["q5", "What chance does your result show for a child being affected in each pregnancy?", ["25%", "0%", "50%"]],
  ],
  ar: [
    ["q1", "هل كون الشخص حاملا يعني أنه مصاب بالحالة؟", ["لا، الحامل ليس مصابا بالحالة", "نعم، دائما"]],
    ["q2", "إذا ظهرت فرصة، فهل يعني ذلك أن الطفل سيتأثر حتما؟", ["لا، هي فرصة وليست يقينا", "نعم، سيحدث ذلك"]],
    ["q3", "من يقرر الخطوة التالية؟", ["أنتما تقرران، مع الدعم إن رغبتما", "المستشار يقرر عنكما", "عائلتكما تقرر عنكما"]],
    ["q4", "هل يمكنكما طلب التحدث مع مستشار وراثي في أي وقت؟", ["نعم", "لا، مرة واحدة فقط"]],
    ["q5", "ما الفرصة التي تظهرها نتيجتكما لتأثر الطفل في كل حمل؟", ["25%", "0%", "50%"]],
  ],
} as const; // first option is correct in this fixture; the real API keeps keys server side and shuffles

export const mock = {
  async login(p: string) { S.persona = p; return p; },
  async results() {
    return [
      { condition_id: "COND_001", label: "Inherited blood disorder 01 (illustrative)", label_ar: "اضطراب وراثي في الدم 01 (توضيحي)", status: "carrier" as const },
      { condition_id: "COND_002", label: "Inherited metabolic condition 02 (illustrative)", label_ar: "حالة أيضية وراثية 02 (توضيحي)", status: "not_detected" as const },
    ];
  },
  async explanation(lang: string, level: string) { return { blocks: EXPL[lang]?.[level] ?? EXPL.en.standard, released: S.released }; },
  async couple() {
    const both = S.pooled.a && S.pooled.b;
    if (!both) return { tier: null, awaiting_counsellor: false, findings: null };
    if (!S.released) return { tier: 3 as const, awaiting_counsellor: true, findings: null };
    return { tier: 3 as const, awaiting_counsellor: false, findings: [{ condition_id: "COND_001", label: "Inherited blood disorder 01 (illustrative)", label_ar: "اضطراب وراثي في الدم 01 (توضيحي)", risk_affected: 0.25, note_codes: ["related_partners"] }] };
  },
  async grantPooling() {
    if (S.persona === "person_b") S.pooled.b = true; else S.pooled.a = true;
    if (!S.consents.find((c) => c.scope === "couple_pooling" && !c.revoked_at))
      S.consents.push({ id: `c${S.consents.length + 1}`, grantee_id: "couple", scope: "couple_pooling", purpose: "couple_planning", expires_at: now() + 90 * day, revoked_at: null });
    return {};
  },
  async consents() { return S.consents; },
  async revoke(id: string) {
    const c = S.consents.find((x) => x.id === id);
    if (c) { c.revoked_at = now(); if (c.scope === "couple_pooling") S.pooled = { a: false, b: false }; if (c.scope === "couple_summary") S.accepted = false; }
    return {};
  },
  async quiz(lang: string) {
    const q = QUIZ[lang === "ar" ? "ar" : "en"];
    return { questions: q.map(([id, text, opts]) => ({ id, text, options: opts.map((o, i) => ({ id: String(i), text: o })) })) };
  },
  async submitQuiz(answers: Record<string, string>) {
    S.attempts += 1;
    const ok = Object.values(answers).every((v) => v === "0");
    if (ok) { S.passed = true; if (!S.steps.length) S.steps.push({ state: "result_released", owner_id: "user", due_at: now() + 7 * day }); return { passed: true }; }
    return S.attempts >= 2 ? { passed: false, counsellor_offered: true } : { passed: false, reexplain: true };
  },
  async pedigree() {
    const P = (id: string, sex: "male" | "female", gen: number, col: number, parents?: [string, string], confirmed = true) => ({ id, sex, gen, col, confirmed, parents });
    return {
      people: [
        P("GF", "male", 0, 2), P("GM", "female", 0, 3),
        P("P1", "male", 1, 0, ["GF", "GM"]), P("S1", "female", 1, 1), P("P2", "female", 1, 4, ["GF", "GM"]), P("S2", "male", 1, 5),
        P("A", "male", 2, 0.5, ["P1", "S1"]), P("B", "female", 2, 4.5, ["S2", "P2"]),
        ...(S.invited ? [P("R1", "female", 2, 2.5, undefined, S.accepted)] : []),
      ],
      related: [["A", "B"]] as [string, string][],
      relationships: [
        { a_id: "GF", b_id: "GM", type: "partner_of" as const, confidence: "known" as const },
        { a_id: "P1", b_id: "S1", type: "partner_of" as const, confidence: "known" as const },
        { a_id: "S2", b_id: "P2", type: "partner_of" as const, confidence: "known" as const },
        { a_id: "A", b_id: "B", type: "partner_of" as const, confidence: "known" as const },
      ],
      warnings: [],
    };
  },
  async invite(kind: string) { S.invited = true; if (kind !== "decline") { S.accepted = true; S.consents.push({ id: `c${S.consents.length + 1}`, grantee_id: "relative", scope: "couple_tier_only", purpose: "family_notification", expires_at: now() + 30 * day, revoked_at: null }); } return {}; },
  async referral() { return S.steps.map((s) => ({ ...s, overdue: s.due_at < now() })); },
  async copilot(text: string) {
    const refuse = /partner|husband|wife|raw|other|his|her|should we|decide|marry/i.test(text);
    return refuse ? { text: "", refused: true } : { text: "Your result says what was found for you. Being a carrier is not the same as having the condition. (Source: your explanation.)", refused: false };
  },
  async queue() { return [{ id: "demo-case", tier: 3, status: S.released ? "released" : "awaiting_counsellor", due_at: now() + 3 * day }, { id: "case-2", tier: 2, status: "awaiting_user", due_at: now() + 9 * day }]; },
  async brief() { return ["tier_3", "finding_COND_001", "related_partners", "quiz", "open"]; },
  async decide(d: string) { if (d === "approve") S.released = true; return {}; },
  async referralEvent(event: string, evidence: string) {
    if (event === "closed" && !evidence) throw new Error("evidence");
    S.steps.push({ state: event, owner_id: "counsellor", due_at: now() + 14 * day });
    return {};
  },
  async dashboard() { return { cells: { tier_1: 388, tier_2: 195, tier_3: 917, small_group: null }, budget_remaining: 1.5 }; },
  async comprehension() {
    return { groups: [{ language: "en", reading_level: "standard", n: 40, pass_rate: 85 }, { language: "en", reading_level: "basic", n: 32, pass_rate: 81 }, { language: "ar", reading_level: "standard", n: 36, pass_rate: 78 }, { language: "ar", reading_level: "basic", n: 30, pass_rate: 70 }], gap_points: 15, target_gap_points: 10, label: "Pipeline test input, not evidence about people." };
  },
  async capacity() {
    return { label: "Illustrative simulation, not a forecast.", runs: [{ policy: "fcfs", median_days: 9.1, p95_days: 24.3, tier3_within_window: 0.31 }, { policy: "tier_priority", median_days: 8.7, p95_days: 21.0, tier3_within_window: 0.74 }, { policy: "tier_priority_auto_tier1", median_days: 4.2, p95_days: 12.5, tier3_within_window: 0.93 }] };
  },
  async auditVerify(tamper: boolean) { S.tamper = tamper; return { valid: !tamper }; },
  async policy() { return { rules: ["Default deny", "Consent required for every read", "No export route", "No employment, insurance or commercial purpose"] }; },
  async sources() { return [{ source: "Synthetic cohort", licence: "Project", kind: "synthetic" }, { source: "configs/panel.yaml", licence: "Project", kind: "synthetic" }]; },
  advance(days: number) { offset += days * day; },
};
