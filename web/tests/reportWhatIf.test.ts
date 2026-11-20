import { expect, test } from "vitest";
import { DATA } from "@/lib/fixtures";
import { recessiveCarrierCouple } from "@/lib/scenario";

const AR = DATA.cohort.carriers.find((c) => c.inheritance === "AR")!.condition_id;

test("two carriers of a recessive condition: the engine's 1 in 4, and at least one of N", () => {
  const one = recessiveCarrierCouple(1, "en", AR);
  expect(one.chance_per_pregnancy.value).toBeCloseTo(0.25, 6);
  expect(one.chance_per_pregnancy.kind).toBe("educational_estimate");
  expect(recessiveCarrierCouple(2, "en", AR).chance_at_least_one.value).toBeCloseTo(1 - 0.75 ** 2, 6);
});

test("the figures are the same for every recessive panel condition", () => {
  const per = DATA.cohort.carriers.filter((c) => c.inheritance === "AR").map((c) => recessiveCarrierCouple(3, "en", c.condition_id).chance_at_least_one.value);
  expect(new Set(per.map((x) => x?.toFixed(9))).size).toBe(1);
});
