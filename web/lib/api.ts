// Typed API client. NEXT_PUBLIC_MOCK=1 (default) serves fixtures so the UI runs without the backend.
// The front end never computes a risk figure: every number below comes from the API or a labelled fixture.
import { z } from "zod";
import { mock } from "./mock";

export const MOCK = process.env.NEXT_PUBLIC_MOCK !== "0";

const Fictional = z.object({ is_synthetic: z.literal(true).optional() });
export const ResultS = Fictional.extend({ condition_id: z.string(), status: z.enum(["carrier", "not_detected", "uncertain"]), label: z.string().optional() });
export const ExplanationS = Fictional.extend({ blocks: z.array(z.string()), released: z.boolean().default(true) });
export const CoupleS = Fictional.extend({
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullish(),
  awaiting_counsellor: z.boolean().optional(),
  findings: z.array(z.object({ condition_id: z.string(), label: z.string().optional(), risk_affected: z.number().nullable(), note_codes: z.array(z.string()) })).nullish(),
});
export const ConsentS = Fictional.extend({ id: z.string(), grantee_id: z.string(), scope: z.string(), purpose: z.string(), expires_at: z.number(), revoked_at: z.number().nullable() });
export const StepS = z.object({ state: z.string(), owner_id: z.string(), due_at: z.number(), overdue: z.boolean().optional() });
export const QuizS = z.object({ questions: z.array(z.object({ id: z.string(), text: z.string(), options: z.array(z.object({ id: z.string(), text: z.string() })) })) });
export const QuizResultS = z.object({ passed: z.boolean(), reexplain: z.boolean().optional(), counsellor_offered: z.boolean().optional() });
export const RelS = z.object({ a_id: z.string(), b_id: z.string(), type: z.enum(["parent_of", "partner_of"]), confidence: z.enum(["known", "reported", "uncertain"]), confirmed: z.boolean().optional() });
export const PedigreeS = z.object({
  people: z.array(z.object({ id: z.string(), sex: z.enum(["male", "female"]), gen: z.number(), col: z.number(), confirmed: z.boolean() })),
  relationships: z.array(RelS), warnings: z.array(z.string()),
});

export type Result = z.infer<typeof ResultS>;
export type Couple = z.infer<typeof CoupleS>;
export type Consent = z.infer<typeof ConsentS>;
export type Step = z.infer<typeof StepS>;
export type Quiz = z.infer<typeof QuizS>;
export type Pedigree = z.infer<typeof PedigreeS>;

let token = "";
export const setToken = (t: string) => { token = t; };

async function call<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers } });
  if (!r.ok) throw new Error(`${r.status}`);
  return schema.parse(await r.json());
}
const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  async login(persona: string) {
    if (MOCK) return mock.login(persona);
    const r = await call(z.object({ access_token: z.string() }), "/api/auth/persona", post({ persona }));
    setToken(r.access_token);
    return persona;
  },
  results: (): Promise<Result[]> => (MOCK ? mock.results() : call(z.array(ResultS), "/api/me/results")),
  explanation: (lang: string, level: string, id = "current") =>
    MOCK ? mock.explanation(lang, level) : call(ExplanationS, `/api/me/results/${id}/explanation`),
  couple: (id = "demo-couple"): Promise<Couple> => (MOCK ? mock.couple() : call(CoupleS, `/api/couples/${id}/assessment`)),
  grantPooling: () => (MOCK ? mock.grantPooling() : call(z.unknown(), "/api/me/consents", post({ scope: "couple_pooling" }))),
  consents: (): Promise<Consent[]> => (MOCK ? mock.consents() : call(z.array(ConsentS), "/api/me/consents")),
  revoke: (id: string) => (MOCK ? mock.revoke(id) : call(z.unknown(), `/api/me/consents/${id}/revoke`, post({}))),
  quiz: (lang: string): Promise<Quiz> => (MOCK ? mock.quiz(lang) : call(QuizS, "/api/cases/demo-case/quiz")),
  submitQuiz: (answers: Record<string, string>) =>
    MOCK ? mock.submitQuiz(answers) : call(QuizResultS, "/api/cases/demo-case/quiz/answers", post({ answers })),
  pedigree: (): Promise<Pedigree> => (MOCK ? mock.pedigree() : call(PedigreeS, "/api/me/pedigree")),
  invite: (kind: string) => (MOCK ? mock.invite(kind) : call(z.unknown(), "/api/invitations", post({ recipient_id: "relative", scope: kind }))),
  referral: (): Promise<Step[]> => (MOCK ? mock.referral() : call(z.object({ referral: z.array(StepS) }), "/api/cases/demo-case/referral").then((r) => r.referral)),
  copilot: (text: string) => (MOCK ? mock.copilot(text) : call(z.object({ text: z.string(), refused: z.boolean().optional() }), "/api/copilot/chat", post({ text }))),
  queue: () => (MOCK ? mock.queue() : call(z.array(z.object({ id: z.string(), tier: z.number(), status: z.string(), due_at: z.number().optional() })), "/api/counsellor/queue")),
  brief: (id: string) => (MOCK ? mock.brief() : call(z.object({ brief: z.array(z.string()) }), `/api/counsellor/cases/${id}/brief`).then((r) => r.brief)),
  decide: (id: string, decision: string) => (MOCK ? mock.decide(decision) : call(z.unknown(), `/api/counsellor/cases/${id}/decision`, post({ decision, reason_code: "reviewed" }))),
  referralEvent: (id: string, event: string, evidence: string) =>
    MOCK ? mock.referralEvent(event, evidence) : call(z.unknown(), `/api/counsellor/cases/${id}/referral/events`, post({ event, evidence_code: evidence || "none" })),
  dashboard: () => (MOCK ? mock.dashboard() : call(z.object({ cells: z.record(z.number().nullable()), budget_remaining: z.number() }), "/api/analytics/dashboard")),
  comprehension: () => (MOCK ? mock.comprehension() : call(z.any(), "/api/analytics/comprehension")),
  capacity: () => (MOCK ? mock.capacity() : call(z.any(), "/api/analytics/capacity")),
  auditVerify: (tamper = false) => (MOCK ? mock.auditVerify(tamper) : call(z.object({ valid: z.boolean() }), "/api/governance/audit-verify")),
  policy: () => (MOCK ? mock.policy() : call(z.any(), "/api/governance/policy")),
  sources: () => (MOCK ? mock.sources() : call(z.any(), "/api/governance/data-sources")),
};
