import { z } from "zod";
import { EstimateS } from "./estimate";
import fixture from "./fixtures/scenarios.json";

export const RELATIONS = ["none", "second_cousins", "first_cousins_once_removed", "first_cousins", "double_first_cousins", "uncle_niece_or_aunt_nephew"] as const;
export const STATUS_A = ["carrier", "not_detected"] as const;
export const STATUS_B = ["carrier", "not_detected", "untested"] as const;
export const ScenarioRequestS = z.object({
  condition_id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/), status_a: z.enum(STATUS_A), status_b: z.enum(STATUS_B),
  relation: z.enum(RELATIONS), children: z.number().int().min(1).max(6), lang: z.string().regex(/^[a-z]{2}$/),
});
export type ScenarioRequest = z.infer<typeof ScenarioRequestS>;
export const ScenarioS = z.object({
  condition_id: z.string(), inheritance: z.enum(["AR", "XLR"]), children: z.number().int(),
  chance_per_pregnancy: EstimateS, chance_at_least_one: EstimateS, partner_carrier_chance: EstimateS.nullish(),
  options: z.array(z.object({ id: z.string(), title: z.string(), changes: z.string() })),
});
export type Scenario = z.infer<typeof ScenarioS>;

// Looks up the figures the Python engine precomputed (scripts/export_scenarios.py). Nothing is calculated here.
// Used by mock mode, and by the browser-only report comparison so a person's reports never leave their device.
export function lookup(req: ScenarioRequest, inheritance: "AR" | "XLR"): Scenario {
  const row = (fixture.table as Record<string, { formula: string; per: number; partner: number | null; atLeast: number[] }>)[`${req.condition_id}|${req.status_a}|${req.status_b}|${req.relation}`];
  if (!row) throw new Error("422");
  const est = (value: number, basis: string) => ({ value, kind: "educational_estimate" as const, basis, method_url: "/methods" });
  const options = (fixture.options as Record<string, { id: string; title: string; changes: string }[]>)[req.lang] ?? fixture.options.en;
  return { condition_id: req.condition_id, inheritance, children: req.children, chance_per_pregnancy: est(row.per, row.formula),
    chance_at_least_one: est(row.atLeast[req.children - 1], "at_least_one_of_n"), partner_carrier_chance: row.partner === null ? null : est(row.partner, "partner_carrier"), options };
}

// Two reported carriers of the same recessive condition: the chance per pregnancy does not depend on which recessive
// condition it is, so any recessive panel condition gives the engine's figures. Only used after the person confirms
// their report says the condition is recessive.
export function recessiveCarrierCouple(children: number, lang: string, conditionId: string): Scenario {
  return lookup({ condition_id: conditionId, status_a: "carrier", status_b: "carrier", relation: "none", children, lang }, "AR");
}
