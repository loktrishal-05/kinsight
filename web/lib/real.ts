// Real-API adapters (NEXT_PUBLIC_MOCK=0). They reshape the backend's strict responses for the screens; no figures are computed here.
import type { z } from "zod";
import { conditionLabel } from "./fixtures";
import { layoutPedigree } from "./pedigreeLayout";
import { trackSlow } from "./slow";
import type * as safety from "./safety";
import type * as plan from "./plan";
import type { ClinVarCheck } from "./clinvar";
import type { Consent, Couple, Pedigree, Quiz, Result, Step } from "./api";

// Tokens live in sessionStorage so a page reload keeps the demo persona (cleared when the tab closes).
const store = (k: string, d = "") => { try { return sessionStorage.getItem(k) ?? d; } catch { return d; } };
const keep = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } };
let token = "", partnerToken = "", me = "synthetic-a";
if (typeof window !== "undefined") { token = store("ks_tok"); partnerToken = store("ks_ptok"); me = store("ks_me", "synthetic-a"); }
const save = () => { keep("ks_tok", token); keep("ks_ptok", partnerToken); keep("ks_me", me); };
// Condition names come from the fictional panel shipped with the app; the API returns only ids.
const conditionLabels = (id: string) => ({ label: conditionLabel(id, "en"), label_ar: conditionLabel(id, "ar") });
const COUPLE = "demo-couple", CASE = "demo-case";
const other = () => (me === "synthetic-a" ? "synthetic-b" : "synthetic-a");

// A fresh tab opened straight on a screen has no token yet: the quiet sign-in below runs first and every API call waits for it.
let pendingLogin: Promise<unknown> | null = null;

async function raw(path: string, init: RequestInit = {}, given?: string): Promise<Response> {
  if (pendingLogin && !path.startsWith("/api/auth/")) await pendingLogin;
  const tok = given === undefined ? token : given; // read after the wait: the quiet sign-in may have just set it
  return trackSlow(fetch(path, { ...init, headers: { "content-type": "application/json", ...(tok ? { authorization: `Bearer ${tok}` } : {}), ...init.headers } }));
}
async function json<T = any>(path: string, init: RequestInit = {}, tok?: string): Promise<T> {
  const r = await raw(path, init, tok);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export type SandboxSubject = "synthetic-a" | "synthetic-b";
export type SandboxReport = {
  revision: number;
  status: string;
  issued_at: string;
  findings: Record<string, Result["status"] | "not_tested">;
};

export type FhirPreview = {
  state: "ready" | "requires_review" | "missing" | "unavailable";
  version?: string;
  issued_at?: string;
  snapshot_id?: string;
  unmapped?: boolean;
  unmapped_source_ids?: string[];
  findings: { condition_id: string; status: "carrier" | "not_detected" | "uncertain"; source_id: string }[];
};

type FhirImportState = {
  state: "missing" | "pending" | "released" | "stale" | "sharing_ended";
  report: FhirPreview | null;
};
async function grant(grantee: string, rtype: string, rid: string, scope: string, fields: string[], purpose: string,
  text_shown = "Fictional consent text") {
  return json("/api/me/consents", post({ grantee_id: grantee, resource_type: rtype, resource_id: rid, scope, fields, purpose,
    expires_at: Date.now() / 1000 + 3000, text_shown }));
}

export const real = {
  outcomes: () => json("/api/analytics/outcomes"),
  cascadeTracker: () => json("/api/lifecycle/cascade-tracker"),
  cascadeContact: (relative_id: string, condition_id: string, method: string) => json("/api/lifecycle/cascade-tracker/contact", post({ relative_id, condition_id, method })),
  cascadeOutcome: (code: string, outcome: string) => json("/api/lifecycle/cascade/outcome", post({ code, outcome })),
  reviewQueue: () => json("/api/lifecycle/review-queue"),
  decideReview: (id: string, decision: string, reason_code: string) => json(`/api/lifecycle/review-queue/${encodeURIComponent(id)}/decision`, post({ decision, reason_code })),
  myReviews: () => json("/api/lifecycle/review-items"),
  whatIf(body: Record<string, string | number>) {
    return json(`/api/lifecycle/scenario?${new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)]))}`);
  },
  addKinPrepQuestion: (text: string) => json("/api/me/kin", post({ tool: "add_question_to_prep", text })),
  prep: () => json("/api/lifecycle/prep"),
  savePrep: (body: unknown) => json("/api/lifecycle/prep", { method: "PUT", body: JSON.stringify(body) }),
  prepSuggestions(stage: string, lang: string, concerns: string[], tier?: number) {
    const q = new URLSearchParams({ stage, lang });
    concerns.forEach((c) => q.append("concerns", c));
    if (tier) q.set("tier", String(tier));
    return json(`/api/lifecycle/prep-suggestions?${q}`);
  },
  async counsellorPrep(subject: string) {
    const r = await raw(`/api/lifecycle/prep-review/${encodeURIComponent(subject)}`);
    if (r.status === 403) return null;
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  },
  previewFhirReport: () => json<FhirPreview>("/api/me/imports/fhir", post({})),
  allowFhirReferral: (text: string) =>
    grant("synthetic-counsellor", "case", CASE, "referral_delivery", ["referral_delivery"], "counselling", text),
  fhirReferral: (action: "send" | "sync") =>
    json<{ state: string; task_id?: string; request_id?: string; synced_at?: number }>(
      `/api/counsellor/cases/${CASE}/referral/fhir/${action}`, post({}),
    ),
  personalFhirImport: () => json<FhirImportState>("/api/me/imports/fhir"),
  async confirmFhirImport(snapshot_id: string) {
    const response = await raw("/api/me/imports/fhir/confirm", post({ snapshot_id }));
    if (!response.ok) throw new Error(String(response.status));
  },
  async reviewFhirImport(subject: SandboxSubject) {
    const response = await raw(`/api/counsellor/fhir-imports/${subject}`);
    if (response.status === 403) return null;
    if (!response.ok) throw new Error(String(response.status));
    return response.json() as Promise<FhirImportState & { snapshot_id: string; can_approve: boolean }>;
  },
  async approveFhirImport(subject: SandboxSubject, snapshot_id: string) {
    const response = await raw(`/api/counsellor/fhir-imports/${subject}/approve`, post({ snapshot_id }));
    if (!response.ok) throw new Error(String(response.status));
  },
  personalLabReport: () => json<{ state: "missing" | "pending" | "withdrawn" | "released"; revision: number | null; report: SandboxReport | null }>("/api/me/sandbox-report"),
  shareLabReport: () => json("/api/me/sandbox-report/share", post({})),
  async reviewLabReport(subject: SandboxSubject) {
    const r = await raw(`/api/counsellor/sandbox-reports/${subject}`);
    if (r.status === 403) return null;
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<{ report: SandboxReport | null; approved: boolean }>;
  },
  async approveLabReport(subject: SandboxSubject, revision: number) {
    const r = await raw(`/api/counsellor/sandbox-reports/${subject}/approve`, post({ revision }));
    if (!r.ok) throw new Error(String(r.status));
  },
  sendLabReport: (subject: SandboxSubject, revision: number, status: "final" | "corrected") =>
    json("/api/sandbox/lab/reports", post({
      subject_id: subject, revision,
      resource: {
        resourceType: "DiagnosticReport", id: `${subject}-report`, subject: { reference: `Patient/${subject}` },
        code: { text: "Synthetic carrier screen" },
        status, issued: new Date().toISOString(), meta: { tag: [{ system: "https://kinsight.example/tags", code: "synthetic" }] },
      },
      findings: { COND_001: status === "corrected" ? "uncertain" : "carrier", COND_002: "not_tested" },
    })),
  bookingSlots: (sla: number) => json(`/api/lifecycle/booking/slots?sla_hours=${sla}`),
  book: (body: z.infer<typeof plan.BookingRequestS>) => json("/api/lifecycle/booking", post(body)),
  cancelBooking: (id: string) => json(`/api/lifecycle/booking/${encodeURIComponent(id)}/cancel`, post({})),
  gestation: (body: z.infer<typeof plan.GestationRequestS>) => json("/api/lifecycle/gestation", post(body)),
  reengagement: (months: number) => json(`/api/lifecycle/reengagement?months_since=${months}`),
  mmic: (body: z.infer<typeof plan.MmicRequestS>) => json("/api/lifecycle/measures/mmic", post(body)),
  gcos: (body: z.infer<typeof plan.GcosRequestS>) => json("/api/lifecycle/measures/gcos", post(body)),
  nasab: (body: z.infer<typeof plan.NasabRequestS>) => json("/api/lifecycle/nasab", post(body)),
  triage: (body: z.infer<typeof safety.TriageRequestS>) => json("/api/lifecycle/triage", post(body)),
  whisper: (body: z.infer<typeof safety.WhisperRequestS>) => json("/api/lifecycle/whisper", post(body)),
  checkin: (body: z.infer<typeof safety.CheckinRequestS>) => json("/api/lifecycle/checkin", post(body)),
  frequency: (variants: string[]) => json("/api/lifecycle/frequency", post({ variants })),
  reclassifyLive: (archived: Record<string, number>) => json<ClinVarCheck>("/api/lifecycle/reclassify/live", post({ archived })),
  reclassify: (body: z.infer<typeof safety.ReclassifyRequestS>) => json("/api/lifecycle/reclassify", post(body)),
  safeVault: (body: z.infer<typeof safety.VaultRequestS>) => json("/api/lifecycle/safe-vault", { ...post(body), method: "PUT" }),
  unlockVault: (body: z.infer<typeof safety.UnlockRequestS>) => json("/api/lifecycle/safe-vault/unlock", post(body)),
  tamm: (body: z.infer<typeof safety.TammRequestS>) => json("/api/lifecycle/tamm", post(body)),
  breakGlass: (body: z.infer<typeof safety.BreakGlassRequestS>) => json("/api/lifecycle/break-glass", post(body)),

  tracker: () => json("/api/lifecycle/tracker"),
  advanceTracker: () => json("/api/lifecycle/tracker/advance", post({})),
  certificate: (elapsed: number) => json(`/api/lifecycle/certificate?elapsed_days=${elapsed}`),
  startPairing: () => json("/api/lifecycle/pairing", post({})),
  confirmPairing: (id: string, pin: string) => json(`/api/lifecycle/pairing/${encodeURIComponent(id)}/confirm`, post({ pin })),
  revokePairing: (id: string) => json(`/api/lifecycle/pairing/${encodeURIComponent(id)}/revoke`, post({})),
  pairing: (id: string) => json(`/api/lifecycle/pairing/${encodeURIComponent(id)}`),
  receipt: () => json("/api/lifecycle/receipt"),
  cascade: (condition_id: string) => json("/api/lifecycle/cascade", post({ condition_id })),
  redeemCascade: (token: string) => json("/api/lifecycle/cascade/redeem", post({ token })),
  async login(persona: string) {
    token = (await json("/api/auth/persona", post({ persona }), "")).access_token;
    partnerToken = "";
    if (persona === "person_a" || persona === "person_b") {
      me = persona === "person_a" ? "synthetic-a" : "synthetic-b";
      partnerToken = (await json("/api/auth/persona", post({ persona: persona.replace("person", "partner") }), "")).access_token;
    }
    save();
    return persona;
  },
  results: async (): Promise<Result[]> => (await json("/api/me/results")).map((r: any) => ({ ...r, ...conditionLabels(r.condition_id) })),
  async accessLog() {
    const d = await json("/api/me/access-log");
    const verb: Record<string, string> = { read: "looked at", grant: "agreed to share", revoke: "stopped sharing", route: "tried to open a page for", copilot: "asked Kin about" };
    const noun: Record<string, string> = { result: "your result", explanation: "your explanation", pedigree: "your family tree", consent: "your consents", couple: "the couple view", case: "your case", audit: "your access trail", invitation: "an invitation" };
    return d.events.map((e: any) => ({
      when: e.when, who: e.who === "you" ? "you" : "someone with access",
      what: `${verb[e.action] ?? e.action.replace(/_/g, " ")} ${noun[e.resource] ?? e.resource}`,
      outcome: e.outcome === "allow" ? "allowed" : e.outcome === "deny" ? "refused" : e.outcome,
    }));
  },
  explanation: async () => json("/api/me/results/current/explanation"),
  async couple(): Promise<Couple> {
    const r = await raw(`/api/couples/${COUPLE}/assessment`, {}, partnerToken);
    if (r.status === 403) return { tier: null, awaiting_counsellor: false, findings: null };
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    return { tier: d.tier, awaiting_counsellor: false, findings: d.findings?.map((f: any) => ({ ...f, ...conditionLabels(f.condition_id) })) ?? null };
  },
  async grantPooling() {
    await grant(other(), "couple", COUPLE, "couple_pooling", ["tier"], "couple_planning");
    return grant(other(), "couple", COUPLE, "couple_summary", ["tier", "shared_conditions", "findings", "engine_version"], "couple_planning");
  },
  consents: async (): Promise<Consent[]> => json("/api/me/consents"),
  revoke: (id: string) => json(`/api/me/consents/${id}/revoke`, post({})),
  quiz: async (): Promise<Quiz> => json(`/api/cases/${CASE}/quiz`),
  async submitQuiz(answers: Record<string, string>) {
    const quiz: Quiz = await json(`/api/cases/${CASE}/quiz`);
    const picks = quiz.questions.map((q) => Math.max(0, q.options.findIndex((o) => o.id === answers[q.id])));
    const s = (await json(`/api/cases/${CASE}/quiz/answers`, post({ answers: picks }))).status;
    return { passed: s === "passed", reexplain: s === "reexplain", counsellor_offered: s === "counsellor_offered" };
  },
  async pedigree(): Promise<Pedigree> {
    const d = await json("/api/me/pedigree");
    return { people: layoutPedigree(d.relationships, d.people ?? []), related: d.related ?? [], relationships: d.relationships, warnings: d.warnings };
  },
  invite: (kind: string) => json("/api/invitations", post({ recipient_id: "synthetic-relative", scope: kind === "decline" ? "relationship_only" : kind })),
  async referral(): Promise<Step[]> {
    const steps: any[] = (await json(`/api/cases/${CASE}/referral`)).referral;
    const flag = steps.some((s) => s.state === "overdue");
    return steps.filter((s) => s.state !== "overdue").map((s, i, a) => ({ ...s, overdue: flag && i === a.length - 1 }));
  },
  async requestCounselling() {  // the person lets the counsellor see only the case brief, referral and quiz status
    await grant("synthetic-counsellor", "case", CASE, "couple_summary", ["brief", "referral"], "counselling");
    return grant("synthetic-counsellor", "case", CASE, "quiz_status", ["status"], "counselling");
  },
  async copilot(text: string) {
    const r = await raw("/api/copilot/chat", post({ text }));
    const line = (await r.text()).split("\n").find((l) => l.startsWith("data: "));
    const d = line ? JSON.parse(line.slice(6)) : {};
    return { text: d.text ?? d.message ?? "", refused: !!d.refused };
  },
  async queue() { return (await json("/api/counsellor/queue?limit=24")).map((c: any) => ({ id: c.id ?? CASE, tier: c.tier ?? 3, status: c.status ?? "case", due_at: c.due_at })); },
  brief: async (id: string) => (await json(`/api/counsellor/cases/${id}/brief`)).brief as string[],
  decide: (id: string, decision: string) => json(`/api/counsellor/cases/${id}/decision`, post({ decision, reason_code: "reviewed" })),
  referralEvent: (id: string, event: string, evidence: string) => json(`/api/counsellor/cases/${id}/referral/events`, post({ event, evidence_code: evidence || "none" })),
  dashboard: () => json("/api/analytics/dashboard"),
  async comprehension() {
    const d = await json("/api/analytics/comprehension");
    return { groups: Object.entries(d.cells).map(([k, n]) => ({ language: k.split("_")[0], reading_level: k.split("_")[1], n: n ?? 0, pass_rate: "—" })), gap_points: "—", target_gap_points: 10, label: "Counts only (suppressed and noised); pass rates need quiz results." };
  },
  capacity: () => json("/api/analytics/capacity/simulation"),
  auditVerify: (tamper = false) => json(`/api/governance/audit-verify${tamper ? "?tamper=true" : ""}`),
  async policy() { const d = await json("/api/governance/policy"); return { rules: [`Purposes: ${d.purposes.join(", ")}`, d.unrelated_use, "Default deny; no export route"] }; },
  async sources() { const d = await json("/api/governance/data-sources", {}, ""); return d.metadata.split("\n").filter((l: string) => l.startsWith("|") && !l.startsWith("|---")).slice(1).map((l: string) => { const c = l.split("|").map((x) => x.trim()); return { source: c[1], licence: c[2], kind: c[3] }; }); },
};

if (process.env.NEXT_PUBLIC_MOCK === "0" && typeof window !== "undefined" && !token && !["/", "/signin", "/report-compare"].includes(window.location.pathname)) {
  let persona = "person_a";
  try { persona = sessionStorage.getItem("ks_persona") ?? localStorage.getItem("ks_persona") ?? persona; } catch { /* private mode */ }
  pendingLogin = real.login(persona).catch(() => { /* the screens show their own error */ }).finally(() => { pendingLogin = null; });
}
