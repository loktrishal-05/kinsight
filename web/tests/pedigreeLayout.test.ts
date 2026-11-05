import { expect, test } from "vitest";
import { layoutPedigree } from "../lib/pedigreeLayout";

const par = (a: string, b: string) => ({ a_id: a, b_id: b, type: "parent_of" as const });
const mate = (a: string, b: string) => ({ a_id: a, b_id: b, type: "partner_of" as const });
// the demo family: first cousins through shared grandparents
const EDGES = [par("gf", "x"), par("gm", "x"), par("gf", "y"), par("gm", "y"), par("x", "synthetic-a"), par("xs", "synthetic-a"),
  par("y", "synthetic-b"), par("ys", "synthetic-b"), mate("gf", "gm"), mate("x", "xs"), mate("y", "ys"), mate("synthetic-a", "synthetic-b")];

test("the demo family gets three generations with parents above children", () => {
  const out = Object.fromEntries(layoutPedigree(EDGES).map((p) => [p.id, p]));
  expect([out.gf.gen, out.gm.gen]).toEqual([0, 0]);
  expect([out.x.gen, out.xs.gen, out.y.gen, out.ys.gen]).toEqual([1, 1, 1, 1]);
  expect([out["synthetic-a"].gen, out["synthetic-b"].gen]).toEqual([2, 2]);
  expect(out["synthetic-a"].parents).toEqual(["x", "xs"]);
  expect(out["synthetic-a"].label).toBe("A");
  expect(out.x.label).toBe("P1");
});

test("nobody shares a spot in a row and nothing is negative", () => {
  const people = layoutPedigree(EDGES);
  const spots = people.map((p) => `${p.gen}:${p.col}`);
  expect(new Set(spots).size).toBe(spots.length);
  expect(Math.min(...people.map((p) => p.col))).toBeGreaterThanOrEqual(0);
});

test("married-in spouses sit next to their partner, and a lone couple stays in one row", () => {
  const out = Object.fromEntries(layoutPedigree(EDGES).map((p) => [p.id, p]));
  expect(Math.abs(out.x.col - out.xs.col)).toBe(1);
  expect(Math.abs(out.y.col - out.ys.col)).toBe(1);
  const pair = layoutPedigree([mate("synthetic-a", "synthetic-b")]);
  expect(pair.map((p) => p.gen)).toEqual([0, 0]);
  expect(Math.abs(pair[0].col - pair[1].col)).toBe(1);
});

test("sex comes from the API when given and defaults safely", () => {
  const out = Object.fromEntries(layoutPedigree([mate("a1", "b1")], [{ id: "a1", sex: "male" }]).map((p) => [p.id, p]));
  expect(out.a1.sex).toBe("male");
  expect(out.b1.sex).toBe("female");
});
