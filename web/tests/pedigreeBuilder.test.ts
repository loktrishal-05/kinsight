import { expect, test } from "vitest";
import { addRelative, removePerson, type Draft } from "../components/PedigreeBuilder";

const base: Draft = {
  people: [{ id: "me", sex: "female", label: "Me", living: true, tested: "tested" }, { id: "mum", sex: "female", label: "Mum", living: true, tested: "unknown" },
    { id: "dad", sex: "male", label: "Dad", living: true, tested: "unknown" }, { id: "p", sex: "male", label: "Partner", living: true, tested: "unknown" }],
  edges: [{ a_id: "mum", b_id: "me", type: "parent_of" }, { a_id: "dad", b_id: "me", type: "parent_of" }, { a_id: "me", b_id: "p", type: "partner_of" }],
};

test("a sibling shares both parents; a child of a couple gets both partners as parents", () => {
  const sib = addRelative(base, "me", "sibling", "male", "Brother", "b");
  expect(sib.edges.filter((e) => e.b_id === "b").map((e) => e.a_id).sort()).toEqual(["dad", "mum"]);
  const kid = addRelative(base, "me", "child", "female", "Daughter", "k");
  expect(kid.edges.filter((e) => e.b_id === "k").map((e) => e.a_id).sort()).toEqual(["me", "p"]);
});

test("removing a person removes every link to them", () => {
  const out = removePerson(base, "mum");
  expect(out.people.map((p) => p.id)).not.toContain("mum");
  expect(out.edges.some((e) => e.a_id === "mum" || e.b_id === "mum")).toBe(false);
});

test("mock mode: a saved tree comes back laid out with its names, and kinship says it needs the service", async () => {
  const { api } = await import("../lib/api");
  const { mock } = await import("../lib/mock");
  mock.reset();
  await api.savePedigree({ people: base.people.map((p) => ({ ...p })), edges: base.edges });
  const tree = await api.pedigree();
  expect(tree.people.map((p) => p.id).sort()).toEqual(["dad", "me", "mum", "p"]);
  expect(tree.people.find((p) => p.id === "me")?.label).toBe("Me");
  expect(tree.relationships.some((e) => e.type === "partner_of")).toBe(true);
  await expect(api.kinship(base, "me", "p")).rejects.toThrow();
});
