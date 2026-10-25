import { expect, test } from "vitest";
import { real } from "../lib/real";

// Runs only against a live demo API: LIVE_API=http://localhost:8000 npx vitest run tests/live.test.ts
const base = process.env.LIVE_API;
const run = base ? test : test.skip;
if (base) {
  const f = globalThis.fetch;
  globalThis.fetch = ((u: any, i?: any) => f(typeof u === "string" && u.startsWith("/") ? base + u : u, i)) as typeof fetch;
}

run("demo flow through the real API adapters", async () => {
  await real.login("person_a");
  expect((await real.results()).some((r) => r.status === "carrier")).toBe(true);
  expect((await real.explanation()).blocks.length).toBeGreaterThan(0);
  await real.grantPooling();
  await real.requestCounselling();
  await real.login("person_b");
  await real.results();
  await real.grantPooling();
  expect((await real.couple()).tier).toBeNull(); // not released yet
  await real.login("counsellor");
  expect((await real.queue()).length).toBeGreaterThan(0);
  expect((await real.brief("demo-case")).length).toBeGreaterThan(0);
  await real.decide("demo-case", "approve");
  await real.login("person_a");
  expect((await real.quiz()).questions.length).toBe(5);
  await real.login("partner_a").catch(() => {});
  await real.login("analyst");
  expect((await real.dashboard()).budget_remaining).toBeGreaterThan(-1);
  expect((await real.capacity()).runs.length).toBe(3);
  await real.login("auditor");
  expect((await real.auditVerify()).valid).toBe(true);
  expect((await real.sources()).length).toBeGreaterThan(0);
});
