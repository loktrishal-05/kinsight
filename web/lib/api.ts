// Typed API client. NEXT_PUBLIC_MOCK=1 (default) serves fixtures so the UI runs without the backend.
// The front end never computes a risk figure: every number below comes from the API or a labelled fixture.
import { z } from "zod";
import { mock } from "./mock";
import { real } from "./real";

export const MOCK = process.env.NEXT_PUBLIC_MOCK !== "0";

const Fictional = z.object({ is_synthetic: z.literal(true).optional() });
export const ResultS = Fictional.extend({ condition_id: z.string(), status: z.enum(["carrier", "not_detected", "uncertain"]), label: z.string().optional(), label_ar: z.string().optional() });
export const ExplanationS = Fictional.extend({ blocks: z.array(z.string()), released: z.boolean().default(true) });
export const CoupleS = Fictional.extend({
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullish(),
  awaiting_counsellor: z.boolean().optional(),
  related: z.boolean().optional(),
  findings: z.array(z.object({ condition_id: z.string(), label: z.string().optional(), label_ar: z.string().optional(), risk_affected: z.number().nullable(),
    note_codes: z.array(z.string()), formula_id: z.string().optional(), inheritance: z.string().optional(), inputs: z.record(z.number()).optional() })).nullish(),
});
export const ConsentS = Fictional.extend({ id: z.string(), grantee_id: z.string(), scope: z.string(), purpose: z.string(), expires_at: z.number(), revoked_at: z.number().nullable() });
export const StepS = z.object({ state: z.string(), owner_id: z.string(), due_at: z.number(), overdue: z.boolean().optional() });
export const QuizS = z.object({ questions: z.array(z.object({ id: z.string(), text: z.string(), options: z.array(z.object({ id: z.string(), text: z.string() })) })) });
export const QuizResultS = z.object({ passed: z.boolean(), reexplain: z.boolean().optional(), counsellor_offered: z.boolean().optional() });
export const RelS = z.object({ a_id: z.string(), b_id: z.string(), type: z.enum(["parent_of", "partner_of"]), confidence: z.enum(["known", "reported", "uncertain"]), confirmed: z.boolean().optional() });
export const PedigreeS = z.object({
  people: z.array(z.object({ id: z.string(), sex: z.enum(["male", "female"]), gen: z.number(), col: z.number(), confirmed: z.boolean(), parents: z.tuple([z.string(), z.string()]).optional() })),
  related: z.array(z.tuple([z.string(), z.string()])).optional(),
  relationships: z.array(RelS), warnings: z.array(z.string()),
});

export type Result = z.infer<typeof ResultS>;
export type Couple = z.infer<typeof CoupleS>;
export type Consent = z.infer<typeof ConsentS>;
export type Step = z.infer<typeof StepS>;
export type Quiz = z.infer<typeof QuizS>;
export type Pedigree = z.infer<typeof PedigreeS>;

export type QueueItem = { id: string; tier: number; status: string; due_at?: number; due_days?: number; language?: string; reading_level?: string;
  age_band?: string; related?: boolean; conditions?: number; step?: string };
export const setToken = (_t: string) => {};

// One table: mock fixtures or the real API, chosen by NEXT_PUBLIC_MOCK (default mock).
const impl = (MOCK ? mock : real) as any;
export const api = {
  login: (p: string): Promise<string> => impl.login(p),
  results: (): Promise<Result[]> => impl.results(),
  explanation: (lang: string, level: string): Promise<{ blocks: string[]; released: boolean }> => impl.explanation(lang, level),
  couple: (): Promise<Couple> => impl.couple(),
  grantPooling: (): Promise<unknown> => impl.grantPooling(),
  consents: (): Promise<Consent[]> => impl.consents(),
  revoke: (id: string): Promise<unknown> => impl.revoke(id),
  quiz: (lang: string): Promise<Quiz> => impl.quiz(lang),
  submitQuiz: (a: Record<string, string>): Promise<z.infer<typeof QuizResultS>> => impl.submitQuiz(a),
  pedigree: (): Promise<Pedigree> => impl.pedigree(),
  invite: (kind: string): Promise<unknown> => impl.invite(kind),
  referral: (): Promise<Step[]> => impl.referral(),
  requestCounselling: (): Promise<unknown> => (MOCK ? mock.referralEvent("counselling_requested", "") : real.requestCounselling()),
  copilot: (t: string): Promise<{ text: string; refused?: boolean }> => impl.copilot(t),
  queue: (): Promise<QueueItem[]> => impl.queue(),
  brief: (id: string): Promise<string[]> => impl.brief(id),
  decide: (id: string, d: string): Promise<unknown> => impl.decide(id, d),
  referralEvent: (id: string, e: string, ev: string): Promise<unknown> => impl.referralEvent(id, e, ev),
  dashboard: (): Promise<{ cells: Record<string, number | null>; budget_remaining: number }> => impl.dashboard(),
  comprehension: (): Promise<any> => impl.comprehension(),
  capacity: (): Promise<any> => impl.capacity(),
  auditVerify: (tamper = false): Promise<{ valid: boolean }> => impl.auditVerify(tamper),
  policy: (): Promise<any> => impl.policy(),
  sources: (): Promise<any> => impl.sources(),
  // Scenario picker, insight charts and the access trail are generated from the committed demo cohort in both modes.
  scenarios: () => mock.scenarios(),
  scenario: () => mock.scenario(),
  setScenario: (id: string) => mock.setScenario(id),
  insights: () => mock.insights(),
  accessLog: (): Promise<{ when: number; who: string; what: string; outcome: string }[]> => mock.accessLog(),
  advance: (days: number) => mock.advance(days),
  resetDemo: () => mock.reset(),
};
