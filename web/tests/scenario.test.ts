import { expect, test } from "vitest";
import { api } from "../lib/api";
import { DATA } from "../lib/fixtures";

const base = { condition_id: DATA.cohort.carriers.find((c) => c.inheritance === "AR")!.condition_id, status_a: "carrier" as const, relation: "none" as const, children: 3, lang: "en" };

test("two carriers are one in four per pregnancy and the estimate is labelled", async () => {
  const r = await api.whatIf({ ...base, status_b: "carrier" });
  expect(r.chance_per_pregnancy).toMatchObject({ value: 0.25, kind: "educational_estimate" });
  expect(r.chance_at_least_one.value).toBeCloseTo(1 - 0.75 ** 3);
});

test("relatedness raises the untested partner's carrier chance and the options keep a fixed order", async () => {
  const a = await api.whatIf({ ...base, status_b: "untested" });
  const b = await api.whatIf({ ...base, status_b: "untested", relation: "first_cousins" });
  expect(b.partner_carrier_chance!.value!).toBeGreaterThan(a.partner_carrier_chance!.value!);
  expect(a.options.map((o) => o.id)).toEqual(["natural_conception", "prenatal_diagnosis", "pgt_m", "donor_gametes", "adoption"]);
});

test("unsupported combinations are refused", async () => {
  await expect(api.whatIf({ ...base, status_a: "not_detected", status_b: "untested" })).rejects.toThrow();
});
