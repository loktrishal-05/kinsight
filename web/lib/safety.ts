import { z } from "zod";

export const GeneCallS = z.object({ gene: z.string().trim().min(1), inheritance: z.enum(["AR", "XLR"]), zygosity: z.enum(["HET", "HOM", "HEMI"]), acmg_class: z.number().int().min(1).max(5), requires_orthogonal: z.boolean(), orthogonal_verified: z.boolean(), allele: z.string() });
export type GeneCall = z.infer<typeof GeneCallS>;
export const TriageRequestS = z.object({ a: z.array(GeneCallS), b: z.array(GeneCallS), phi: z.number().min(0).max(0.5), pregnant_days: z.number().int().nonnegative().nullable(), dcs: z.number().min(0).max(100).nullable(), teach_back_failures: z.number().int().nonnegative() });
export type TriageRequest = z.infer<typeof TriageRequestS>;
export const TriageS = z.object({ tier: z.number().int().min(1).max(3), rules: z.array(z.string()), shared_genes: z.array(z.string()), combined_risk_pct: z.number().min(0).max(100), hold_release: z.boolean(), private_counts: z.object({ a: z.number().int().nonnegative(), b: z.number().int().nonnegative() }), sla_hours: z.number().nonnegative().nullable() });
export const CheckinRequestS = z.object({ instrument: z.enum(["dcs", "low_literacy_dcs", "pagis"]), answers: z.array(z.union([z.number(), z.string()])).nullable(), total: z.number().nonnegative().nullable() }).superRefine((v, ctx) => {
  const valid = v.instrument === "pagis" ? v.answers === null && v.total !== null : v.total === null && v.answers?.length === (v.instrument === "dcs" ? 16 : 10) && v.answers.every((a) => v.instrument === "dcs" ? typeof a === "number" && Number.isInteger(a) && a >= 0 && a <= 4 : ["yes", "unsure", "no"].includes(String(a)));
  if (!valid) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Complete the selected instrument" });
});
export type CheckinRequest = z.infer<typeof CheckinRequestS>;
export const CheckinS = z.object({ score: z.number(), flagged: z.boolean(), support_offered: z.boolean() });
export const WhisperRequestS = z.object({ contact: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/), gene_family: z.string().trim().min(1) });
export const WhisperS = z.object({ status: z.literal("queued") });
export const ReclassifyRequestS = z.object({ archived: z.record(z.number().int().min(1).max(5)), feed: z.record(z.number().int().min(1).max(5)) });
export const ReclassifyS = z.object({ alerts: z.array(z.object({ variant: z.string(), from: z.number().int().min(1).max(5), to: z.number().int().min(1).max(5), direction: z.enum(["upgraded", "downgraded"]), needs_clinician_review: z.boolean() })) });
export const VaultRequestS = z.object({ pin: z.string().regex(/^\d{4,12}$/), decoy_pin: z.string().regex(/^\d{4,12}$/) }).refine((v) => v.pin !== v.decoy_pin, "Use two different PINs");
export const VaultS = z.object({ status: z.string() });
export const UnlockRequestS = z.object({ pin: z.string().regex(/^\d{4,12}$/) });
export const UnlockS = z.object({ view: z.enum(["real", "decoy"]) });
export const TammRequestS = z.object({ pairing_ref: z.string().trim().min(1), role: z.enum(["pcp", "counsellor"]) });
export const TammS = z.object({ pairing_ref: z.string(), screening_completed: z.boolean(), counselling_completed: z.boolean(), signed_off_by_role: z.enum(["pcp", "counsellor"]), issued_at: z.union([z.string(), z.number()]) });
export const BreakGlassRequestS = z.object({ attestors: z.array(z.string().trim().min(1)).length(2), reason: z.string().trim().min(1) }).refine((v) => v.attestors[0] !== v.attestors[1], "Two distinct clinicians are required");
export const BreakGlassS = z.object({ granted: z.boolean(), attestors: z.array(z.string()), alert_siem: z.boolean(), notify_citizen: z.boolean() });

export const geneCall = (gene: string): GeneCall => ({ gene, inheritance: "AR", zygosity: "HET", acmg_class: 5, requires_orthogonal: false, orthogonal_verified: true, allele: "demo-1" });
export const TRIAGE_PRESETS = ["shared", "multi", "pending", "compound", "pregnancy", "none"] as const;
export function triagePreset(preset: typeof TRIAGE_PRESETS[number]): TriageRequest {
  const call = geneCall("HBB");
  return { a: preset === "none" ? [] : [call, ...(preset === "multi" ? [geneCall("CFTR")] : [])],
    b: preset === "none" ? [] : [{ ...call, allele: preset === "compound" ? "demo-2" : call.allele, requires_orthogonal: preset === "pending", orthogonal_verified: preset !== "pending" }, ...(preset === "multi" ? [geneCall("CFTR")] : [])],
    phi: 0, pregnant_days: preset === "pregnancy" ? 90 : null, dcs: null, teach_back_failures: 0 };
}
