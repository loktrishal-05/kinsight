import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { api, CertificateS } from "../lib/api";
import { mock } from "../lib/mock";
import { real } from "../lib/real";
import { GcosRequestS, NasabRequestS, RELATIONS } from "../lib/plan";
import { DATA } from "../lib/fixtures";
import en from "../messages/en.json";

beforeEach(() => mock.reset());
afterEach(() => vi.restoreAllMocks());

test("booking offers slots for every urgency, isolates people and cancels", async () => {
  await mock.login("person_a");
  for (const sla of [120, 48, 12]) expect((await api.bookingSlots(sla)).slots).toHaveLength(2);
  const { slots } = await mock.bookingSlots(48);
  const booking = await api.book({ slot_at: slots[0] });
  expect(booking).toMatchObject({ slot_at: slots[0], status: "booked" });
  expect(api.demoBooking()).toEqual(booking);
  await expect(mock.book({ slot_at: slots[1] })).rejects.toThrow("409");
  await mock.login("person_b");
  expect(api.demoBooking()).toBeNull();
  await expect(mock.cancelBooking(booking.id)).rejects.toThrow("404");
  await mock.login("person_a");
  expect(await api.cancelBooking(booking.id)).toEqual({ status: "cancelled" });
  expect((await api.book({ slot_at: slots[1] })).id).not.toBe(booking.id);
  await expect(api.bookingSlots(5)).rejects.toThrow();
  await expect(mock.book({ slot_at: 42 })).rejects.toThrow();
  mock.reset();
  expect(api.demoBooking()).toBeNull();
});

test("gestation calendar boundaries and re-engagement months", async () => {
  expect(await api.gestation({ days_since_lmp: 71 })).toEqual({ days: 71, weeks: 10, in_cvs_window: true, days_to_day_120: 49, past_day_120: false });
  for (const [days, window] of [[0, false], [69, false], [70, true], [84, true], [85, false], [300, false]] as const) {
    expect((await mock.gestation({ days_since_lmp: days })).in_cvs_window).toBe(window);
  }
  expect(await mock.gestation({ days_since_lmp: 120 })).toMatchObject({ days_to_day_120: 0, past_day_120: false });
  expect(await mock.gestation({ days_since_lmp: 121 })).toMatchObject({ days_to_day_120: 0, past_day_120: true });
  for (const days of [-1, 301, 1.5]) await expect(mock.gestation({ days_since_lmp: days })).rejects.toThrow();
  for (const month of [0, 5, 6, 7, 11, 12, 13]) expect((await api.reengagement(month)).due_month).toBe(month === 6 || month === 12 ? month : null);
  await expect(mock.reengagement(-1)).rejects.toThrow();
});

test("informed choice accepts either consistent attitude and action; empowerment needs 24 answers", async () => {
  const body = { knowledge_correct: 4, knowledge_total: 5, attitude: "favourable" as const, acted: true };
  expect((await api.mmic(body)).informed).toBe(true);
  expect((await api.mmic({ ...body, attitude: "unfavourable", acted: false })).informed).toBe(true);
  expect((await api.mmic({ ...body, acted: false })).informed).toBe(false);
  expect((await api.mmic({ ...body, knowledge_correct: 0 })).informed).toBe(false);
  for (const bad of [{ ...body, knowledge_total: 0 }, { ...body, knowledge_correct: 6 }]) await expect(mock.mmic(bad)).rejects.toThrow();
  expect(await api.gcos({ answers: Array(24).fill(1) })).toEqual({ total: 24 });
  expect(await mock.gcos({ answers: Array(24).fill(7) })).toEqual({ total: 168 });
  expect(await api.gcos({ answers: Array.from({ length: 24 }, (_, i) => i % 7 + 1) })).toEqual({ total: 90 });
  expect(GcosRequestS.safeParse({ answers: Array(23).fill(1) }).success).toBe(false);
  await expect(mock.gcos({ answers: Array(24).fill(8) })).rejects.toThrow();
});

test("nasab uses labelled fixed fixtures and validates up to four loops without computing F", async () => {
  for (const [i, relation] of RELATIONS.entries()) {
    expect(await api.nasab({ relations: [relation] })).toEqual({ f: [0, 0.015625, 0.03125, 0.0625, 0.125, 0.125][i], phi: [0, 0.015625, 0.03125, 0.0625, 0.125, 0.125][i], label_key: `plan.relation.${relation}`, warnings: [] });
  }
  expect(await mock.nasab({ relations: Array(4).fill("first_cousins") })).toMatchObject({ f: 0.0625, warnings: ["plan.demoLoops"] });
  for (const relations of [[], ["unknown"], ["none", "first_cousins"], Array(5).fill("first_cousins")]) expect(NasabRequestS.safeParse({ relations }).success).toBe(false);
});

test("certificate accepts absent lock fields and mock opens after understanding check", async () => {
  const certificate = await api.certificate(0);
  expect(certificate).toMatchObject({ locked: true, locked_reason: "teach_back" });
  const { locked, locked_reason, ...legacy } = certificate;
  expect(CertificateS.parse(legacy).locked).toBeUndefined();
  await mock.submitQuiz(Object.fromEntries(DATA.scenarios.find((s) => s.id === mock.scenario())!.quiz.en.map((q) => [q.id, q.answer])));
  expect((await api.certificate(0)).locked).toBe(false);
});

test("real care-plan adapters preserve JSON and Bearer transport", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ access_token: "plan-token" }) } as Response);
  await real.login("demo_operator");
  await real.bookingSlots(12);
  expect(fetcher).toHaveBeenLastCalledWith("/api/lifecycle/booking/slots?sla_hours=12", { headers: { "content-type": "application/json", authorization: "Bearer plan-token" } });
  const cases = [
    ["book", "booking", { slot_at: 1793664000 }],
    ["gestation", "gestation", { days_since_lmp: 71 }],
    ["mmic", "measures/mmic", { knowledge_correct: 4, knowledge_total: 5, attitude: "favourable", acted: true }],
    ["gcos", "measures/gcos", { answers: Array(24).fill(4) }],
    ["nasab", "nasab", { relations: ["first_cousins"] }],
  ] as const;
  for (const [method, path, body] of cases) {
    await (real[method] as (v: unknown) => Promise<unknown>)(body);
    expect(fetcher).toHaveBeenLastCalledWith(`/api/lifecycle/${path}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", authorization: "Bearer plan-token" } });
  }
  await real.cancelBooking("a/b");
  expect(fetcher.mock.lastCall?.[0]).toBe("/api/lifecycle/booking/a%2Fb/cancel");
  await real.reengagement(6);
  expect(fetcher.mock.lastCall?.[0]).toBe("/api/lifecycle/reengagement?months_since=6");
});

test("every language has draft care-plan messages", () => {
  const keys = Object.keys(en).filter((key) => key.startsWith("plan."));
  for (const lang of ["en", "ar", "hi", "kn", "ml", "ta", "te", "ur"]) {
    const messages = JSON.parse(readFileSync(new URL(`../messages/${lang}.json`, import.meta.url), "utf8"));
    for (const key of keys) { expect(messages[key]).toBeTypeOf("string"); expect(messages[key]).not.toMatch(/\?{2}|0% risk/); }
  }
});

test("service worker bypasses APIs, revalidates assets and falls back offline", async () => {
  const handlers: Record<string, (event: any) => void> = {};
  const fallback = new Response("offline");
  const cached = new Response("cached asset");
  const put = vi.fn();
  const cache = { put, match: vi.fn(async (request) => request === "/offline.html" ? fallback : request.url?.includes("/_next/static/") ? cached : undefined) };
  const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
  runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    self: { location: { origin: "https://kinsight.test" }, addEventListener: (name: string, handler: any) => { handlers[name] = handler; } },
    caches: { open: async () => cache }, fetch: fetcher, URL, Response,
  });
  const event = (path: string, mode = "navigate", method = "GET") => ({ request: { url: `https://kinsight.test${path}`, mode, method }, respondWith: vi.fn(), waitUntil: vi.fn() });
  for (const request of [event("/api/lifecycle/booking"), event("/api"), event("/plan", "navigate", "POST")]) {
    handlers.fetch(request); expect(request.respondWith).not.toHaveBeenCalled();
  }
  const asset = event("/_next/static/app.js", "cors"); handlers.fetch(asset);
  expect(await asset.respondWith.mock.calls[0][0]).toBe(cached);
  await Promise.all(asset.waitUntil.mock.calls.map(([promise]) => promise));
  const page = event("/plan"); handlers.fetch(page);
  expect(await page.respondWith.mock.calls[0][0]).toBe(fallback);
  expect(put).not.toHaveBeenCalled();
});
