import { z } from "zod";

export const KINDS = ["couple_result", "fhir_import", "lab_report", "counselling_request", "reclassification"] as const;
export const ItemS = z.object({ id: z.string(), kind: z.enum(KINDS), reason: z.string(), state: z.string(), subject: z.string().nullable(),
  created_at: z.number(), due_at: z.number(), dedicated: z.boolean(), link: z.string() });
export const QueueS = z.object({ items: z.array(ItemS) });
export const MineS = z.object({ items: z.array(z.object({ kind: z.enum(KINDS), state: z.string(), due_at: z.number(), expected_hours: z.number() })) });
export const DecisionS = z.object({ status: z.string() });
export type Item = z.infer<typeof ItemS>;
export type Mine = z.infer<typeof MineS>["items"][number];
export const OPEN = ["pending", "held", "more_info"];
