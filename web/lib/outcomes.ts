import { z } from "zod";

export const NAMES = ["result_viewed", "teach_back_passed", "prep_sheet_created", "prep_sheet_shared", "session_booked",
  "counsellor_requested", "cascade_reached", "cascade_tested", "imports_confirmed", "reviews_overdue"] as const;
export const OutcomesS = z.object({
  metrics: z.array(z.object({ name: z.enum(NAMES), label: z.string(), source: z.string(), total: z.number().nullable(),
    groups: z.record(z.string(), z.number().nullable()), rates: z.record(z.string(), z.number().nullable()).optional(), equity_alert: z.boolean().optional() })),
  min_cell: z.number().int(), marriage_outcomes_measured: z.literal(false),
});
export type Outcomes = z.infer<typeof OutcomesS>;
