import { expect, test } from "vitest";
import { mock } from "../lib/mock";

// Mock-mode walk through demo steps 3-6 (fixtures, not evidence about people).
test("couple view waits for both, then counsellor, then released", async () => {
  await mock.login("person_a"); await mock.grantPooling();
  expect((await mock.couple()).tier).toBeNull(); // one side only: no couple figure
  await mock.login("person_b"); await mock.grantPooling();
  expect((await mock.couple()).awaiting_counsellor).toBe(true);
  await mock.decide("approve");
  const c = await mock.couple();
  expect(c.findings?.[0].risk_affected).toBe(0.25);
});

test("one wrong answer re-explains, second failure offers a counsellor, never a third loop", async () => {
  const wrong = { q1: "1" };
  expect((await mock.submitQuiz(wrong)).reexplain).toBe(true);
  expect((await mock.submitQuiz(wrong)).counsellor_offered).toBe(true);
});

test("closing without evidence is refused", async () => {
  await expect(mock.referralEvent("closed", "")).rejects.toThrow();
});

test("revoking pooling removes the couple figure at once", async () => {
  const [c] = (await mock.consents()).filter((x) => x.scope === "couple_pooling");
  await mock.revoke(c.id);
  expect((await mock.couple()).tier).toBeNull();
});
