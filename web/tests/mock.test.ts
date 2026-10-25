import { beforeEach, expect, test } from "vitest";
import { DATA } from "../lib/fixtures";
import { mock } from "../lib/mock";

// Mock-mode behaviour on generated fixtures (engine + templates + demo cohort). Fictional data, not evidence about people.
beforeEach(() => { mock.reset(); mock.setScenario("s3"); });

test("fixtures: seven scenarios from the engine, every tier present, quiz keys exist", () => {
  expect(DATA.scenarios.length).toBeGreaterThanOrEqual(7);
  expect(new Set(DATA.scenarios.map((s) => s.tier))).toEqual(new Set([1, 2, 3]));
  expect(DATA.scenarios.find((s) => s.id === "s3")!.findings[0].risk_affected).toBe(0.25);
  expect(DATA.queue.length).toBeGreaterThan(20);
  expect(DATA.cohort.carriers.length).toBe(30);
  for (const s of DATA.scenarios) expect(s.quiz.en.every((q) => q.options.some((o) => o.id === q.answer))).toBe(true);
});

test("couple figure waits for both partners, then (tier 3) for the counsellor, then is released", async () => {
  await mock.login("person_a"); await mock.grantPooling();
  expect((await mock.couple()).tier).toBeNull();
  await mock.login("person_b"); await mock.grantPooling();
  expect((await mock.couple()).awaiting_counsellor).toBe(true);
  await mock.decide("demo-case", "approve");
  const c = await mock.couple();
  expect(c.findings?.[0].risk_affected).toBe(0.25);
});

test("lower tiers are released as soon as both agree (no counsellor gate)", async () => {
  mock.setScenario("s2");
  await mock.login("person_a"); await mock.grantPooling();
  await mock.login("person_b"); await mock.grantPooling();
  const c = await mock.couple();
  expect(c.awaiting_counsellor).toBe(false);
  expect(c.tier).toBe(2);
});

test("a result that is not clear gives no figure", async () => {
  mock.setScenario("s5");
  await mock.login("person_a"); await mock.grantPooling();
  await mock.login("person_b"); await mock.grantPooling();
  await mock.decide("demo-case", "approve");
  expect((await mock.couple()).findings?.[0].risk_affected).toBeNull();
});

test("one wrong answer re-explains, a second failure offers a counsellor, never a third loop", async () => {
  const q = await mock.quiz("en");
  const wrong = Object.fromEntries(q.questions.map((x) => [x.id, "z"]));
  expect((await mock.submitQuiz(wrong)).reexplain).toBe(true);
  expect((await mock.submitQuiz(wrong)).counsellor_offered).toBe(true);
  const right = Object.fromEntries(DATA.scenarios[2].quiz.en.map((x) => [x.id, x.answer]));
  expect((await mock.submitQuiz(right)).passed).toBe(true);
});

test("closing a referral without evidence is refused", async () => {
  await expect(mock.referralEvent("demo-case", "closed", "")).rejects.toThrow();
  await expect(mock.referralEvent("demo-case", "closed", "evidence-1")).resolves.toEqual({});
});

test("revoking pooling removes the couple figure at once", async () => {
  await mock.login("person_a"); await mock.grantPooling();
  await mock.login("person_b"); await mock.grantPooling();
  const [c] = (await mock.consents()).filter((x) => x.scope === "couple_pooling");
  await mock.revoke(c.id);
  expect((await mock.couple()).tier).toBeNull();
});
