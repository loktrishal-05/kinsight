import { z } from "zod";
import { EstimateS } from "./estimate";
import fixture from "./fixtures/cascade.json";

export const STATUSES = ["not_contacted", "invited", "opened", "tested", "declined", "told", "notified"] as const;
export const METHODS = ["invite", "whisper", "in_person", "none"] as const;
export type Method = typeof METHODS[number];
const RelS = z.object({ id: z.string(), relation: z.string(), degree: z.number().int(), chance: EstimateS, status: z.enum(STATUSES), method: z.string().nullable() });
export const TrackerS = z.object({
  conditions: z.array(z.object({ condition_id: z.string(), inheritance: z.string(), needs_counsellor: z.boolean(), relatives: z.array(RelS) })),
  counts: z.record(z.string(), z.number()),
});
export type Tracker = z.infer<typeof TrackerS>;
export const ContactS = z.object({ status: z.enum(STATUSES), token: z.string().optional() });

// Mock mode only: the relatives and chances were computed by the Python engine (scripts/export_cascade.py).
export function mockTracker(persona: string, rows: Record<string, { status: string; method: string }>): Tracker {
  const conds = (fixture as Record<string, { condition_id: string; inheritance: string; needs_counsellor: boolean; relatives: { id: string; relation: string; degree: number; chance: number }[] }[]>)[persona] ?? [];
  const counts: Record<string, number> = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  const conditions = conds.map((c) => ({ ...c, relatives: c.relatives.map((r) => {
    const row = rows[`${persona}|${r.id}|${c.condition_id}`];
    const status = (row?.status ?? "not_contacted") as Tracker["conditions"][number]["relatives"][number]["status"];
    counts[status] += 1;
    return { ...r, chance: { value: r.chance, kind: "educational_estimate" as const, basis: "cascade_relative", method_url: "/methods" }, status, method: row?.method ?? null };
  }) }));
  return { conditions, counts };
}
