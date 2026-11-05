// Typed API client. NEXT_PUBLIC_MOCK=1 (default) serves fixtures so the UI runs without the backend.
// The front end never computes a risk figure: every number below comes from the API or a labelled fixture.
import { z } from "zod";
import { mock } from "./mock";
import { real } from "./real";
import * as safety from "./safety";
import * as plan from "./plan";
import type { z as Zod } from "zod";

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
  people: z.array(z.object({ id: z.string(), label: z.string().optional(), sex: z.enum(["male", "female"]), gen: z.number(), col: z.number(), confirmed: z.boolean(), parents: z.tuple([z.string(), z.string()]).optional() })),
  related: z.array(z.tuple([z.string(), z.string()])).optional(),
  relationships: z.array(RelS), warnings: z.array(z.string()),
});

export const TrackerS = z.object({ stages: z.array(z.string()).length(8), stage: z.number().int().min(1).max(8), qc_failure: z.string().nullable(), times: z.record(z.number()) });
export const CertificateS = z.object({ days_left: z.number().min(0).max(90), expired: z.boolean(), alert_at: z.union([z.literal(60), z.literal(30), z.literal(14), z.literal(7)]).nullable(), genetic_compatibility: z.literal("permanent"), locked: z.boolean().optional(), locked_reason: z.literal("teach_back").optional() });
export const PairingS = z.object({ id: z.string(), pin: z.string().regex(/^\d{9}$/), expires_in: z.number().nonnegative() });
export const PairingStatusS = z.object({ status: z.enum(["pending", "active", "revoked", "expired"]) });
const MoneyS = z.string().regex(/^\d+\.\d{2}$/);
export const ReceiptS = z.object({ lines: z.array(z.object({ label: z.string(), gross: MoneyS, insurer: MoneyS, grant: MoneyS, copay: MoneyS })), total: MoneyS, your_share: MoneyS });
export const CascadeS = z.object({ token: z.string().min(1) });
export const RedeemedS = z.object({ condition_id: z.string().min(1) });
export type PairingStatus = z.infer<typeof PairingStatusS>;

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
  demoBooking: () => MOCK ? mock.currentBooking() : null,
  bookingSlots: async (sla: number) => plan.SlotsS.parse(await impl.bookingSlots(plan.SlaS.parse(sla))),
  book: async (body: Zod.infer<typeof plan.BookingRequestS>) => plan.BookingS.parse(await impl.book(plan.BookingRequestS.parse(body))),
  cancelBooking: async (id: string) => plan.CancelS.parse(await impl.cancelBooking(z.string().min(1).parse(id))),
  gestation: async (body: Zod.infer<typeof plan.GestationRequestS>) => plan.GestationS.parse(await impl.gestation(plan.GestationRequestS.parse(body))),
  reengagement: async (months: number) => plan.ReengagementS.parse(await impl.reengagement(plan.MonthsS.parse(months))),
  mmic: async (body: Zod.infer<typeof plan.MmicRequestS>) => plan.MmicS.parse(await impl.mmic(plan.MmicRequestS.parse(body))),
  gcos: async (body: Zod.infer<typeof plan.GcosRequestS>) => plan.GcosS.parse(await impl.gcos(plan.GcosRequestS.parse(body))),
  nasab: async (body: Zod.infer<typeof plan.NasabRequestS>) => plan.NasabS.parse(await impl.nasab(plan.NasabRequestS.parse(body))),
  triage: async (body: Zod.infer<typeof safety.TriageRequestS>) => safety.TriageS.parse(await impl.triage(safety.TriageRequestS.parse(body))),
  whisper: async (body: Zod.infer<typeof safety.WhisperRequestS>) => safety.WhisperS.parse(await impl.whisper(safety.WhisperRequestS.parse(body))),
  checkin: async (body: Zod.infer<typeof safety.CheckinRequestS>) => safety.CheckinS.parse(await impl.checkin(safety.CheckinRequestS.parse(body))),
  frequency: async (variants: string[]) => safety.FrequencyS.parse(await impl.frequency(variants)),
  reclassifyLive: async (archived: Record<string, number>) => safety.ReclassifyS.parse(await impl.reclassifyLive(archived)),
  reclassify: async (body: Zod.infer<typeof safety.ReclassifyRequestS>) => safety.ReclassifyS.parse(await impl.reclassify(safety.ReclassifyRequestS.parse(body))),
  safeVault: async (body: Zod.infer<typeof safety.VaultRequestS>) => safety.VaultS.parse(await impl.safeVault(safety.VaultRequestS.parse(body))),
  unlockVault: async (body: Zod.infer<typeof safety.UnlockRequestS>) => safety.UnlockS.parse(await impl.unlockVault(safety.UnlockRequestS.parse(body))),
  tamm: async (body: Zod.infer<typeof safety.TammRequestS>) => safety.TammS.parse(await impl.tamm(safety.TammRequestS.parse(body))),
  breakGlass: async (body: Zod.infer<typeof safety.BreakGlassRequestS>) => safety.BreakGlassS.parse(await impl.breakGlass(safety.BreakGlassRequestS.parse(body))),

  tracker: async () => TrackerS.parse(await impl.tracker()),
  advanceTracker: async () => TrackerS.parse(await impl.advanceTracker()),
  certificate: async (elapsed: number) => CertificateS.parse(await impl.certificate(elapsed)),
  startPairing: async () => PairingS.parse(await impl.startPairing()),
  confirmPairing: async (id: string, pin: string) => PairingStatusS.parse(await impl.confirmPairing(id, pin)),
  revokePairing: async (id: string) => PairingStatusS.parse(await impl.revokePairing(id)),
  pairing: async (id: string) => PairingStatusS.parse(await impl.pairing(id)),
  receipt: async () => ReceiptS.parse(await impl.receipt()),
  cascade: async (condition: string) => CascadeS.parse(await impl.cascade(condition)),
  redeemCascade: async (token: string) => RedeemedS.parse(await impl.redeemCascade(token)),
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
  requestCounselling: (): Promise<unknown> => (MOCK ? mock.referralEvent("demo-case", "counselling_requested", "") : real.requestCounselling()),
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
  accessLog: (): Promise<{ when: number; who: string; what: string; outcome: string }[]> => impl.accessLog(),
  advance: (days: number) => mock.advance(days),
  resetDemo: () => mock.reset(),
};
