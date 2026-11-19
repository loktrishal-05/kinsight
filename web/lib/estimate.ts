import { z } from "zod";

// The API's risk-figure envelope: a chance is never a bare number (services/api/schemas.py: Estimate).
export const EstimateS = z.object({ value: z.number().min(0).max(1).nullable(), kind: z.literal("educational_estimate"), basis: z.string(), method_url: z.string() });
export type EstimateInfo = z.infer<typeof EstimateS>;
