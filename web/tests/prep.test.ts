import { beforeEach, expect, test } from "vitest";
import { api } from "../lib/api";
import { mock } from "../lib/mock";
import { EMPTY, shared, suggest } from "../lib/prep";

beforeEach(() => mock.reset());

test("suggestions are ordered and independent of the order concerns were ticked", () => {
  const a = suggest("en", "pregnant", ["privacy", "cost"], 3), b = suggest("en", "pregnant", ["cost", "privacy"], 3);
  expect(a).toEqual(b);
  const ids = a.questions.map((q) => q.id);
  expect(ids[0]).toBe("general_0");
  expect(ids.indexOf("cost_0")).toBeLessThan(ids.indexOf("privacy_0"));
  expect(new Set(ids).size).toBe(ids.length);
  expect(suggest("hi", "pregnant", []).placeholder).toBe(true);
  expect(suggest("ar", "pregnant", []).placeholder).toBe(false);
});

test("only switched-on sections are shared", () => {
  const sheet = { ...EMPTY, values: ["q1"], concerns: ["cost" as const], worries_text: "private", questions: [{ id: "general_0", text: "Q" }], bring: ["report" as const], share: ["questions" as const, "bring" as const] };
  expect(Object.keys(shared(sheet).sections).sort()).toEqual(["bring", "questions"]);
  expect(shared({ ...sheet, share: [] }).sections).toEqual({});
});

test("mock round trip: nothing reaches the counsellor until a section is switched on", async () => {
  const sheet = { ...EMPTY, questions: [{ id: "general_0", text: "Q" }] };
  await api.savePrep(sheet);
  expect(await api.counsellorPrep("synthetic-a")).toBeNull();
  await api.savePrep({ ...sheet, share: ["questions"] });
  expect((await api.counsellorPrep("synthetic-a"))?.shared).toEqual(["questions"]);
  expect((await api.prep())?.questions).toHaveLength(1);
});
