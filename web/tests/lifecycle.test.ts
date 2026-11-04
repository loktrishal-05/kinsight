import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mock } from "../lib/mock";
import { api, TrackerS, ReceiptS } from "../lib/api";
import { DATA } from "../lib/fixtures";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-04T00:00:00Z")); mock.reset(); });
afterEach(() => vi.useRealTimers());

test("tracker advances through eight stages and stops at the signed report", async () => {
  expect((await api.tracker()).stage).toBe(1);
  for (let stage = 2; stage <= 8; stage++) {
    const tracker = TrackerS.parse(await mock.advanceTracker());
    expect(tracker.stage).toBe(stage);
    expect(Object.keys(tracker.times)).toHaveLength(stage);
    expect(tracker.times[tracker.stages[stage - 1]]).toBeTypeOf("number");
  }
  expect((await mock.advanceTracker()).stage).toBe(8);
});

test("certificate fixtures cover alerts, expiry and permanent compatibility", async () => {
  expect((await mock.certificate(0)).days_left).toBe(90);
  for (const alert of [60, 30, 14, 7]) expect((await mock.certificate(90 - alert)).alert_at).toBe(alert);
  for (const elapsed of [90, 120]) expect(await api.certificate(elapsed)).toMatchObject({ days_left: 0, expired: true, genetic_compatibility: "permanent" });
  await expect(mock.certificate(-1)).rejects.toThrow("422");
});

test("pairing confirms only a matching pending PIN and can stop sharing", async () => {
  const pair = await api.startPairing();
  expect(pair.pin).toMatch(/^\d{9}$/);
  expect(pair.expires_in).toBe(900);
  expect(await mock.pairing(pair.id)).toEqual({ status: "pending" });
  await expect(mock.confirmPairing(pair.id, "000000000")).rejects.toThrow("403");
  expect(await api.confirmPairing(pair.id, pair.pin)).toEqual({ status: "active" });
  expect(await api.revokePairing(pair.id)).toEqual({ status: "revoked" });
  await expect(mock.confirmPairing(pair.id, pair.pin)).rejects.toThrow("403");
});

test("pending PIN expires after fifteen minutes", async () => {
  const pair = await mock.startPairing();
  vi.advanceTimersByTime(900_000);
  expect(await api.pairing(pair.id)).toEqual({ status: "expired" });
  await expect(mock.confirmPairing(pair.id, pair.pin)).rejects.toThrow("403");
});

test("receipt contains only fixed own-share lines and decimal strings", async () => {
  expect(ReceiptS.parse(await mock.receipt())).toEqual({ lines: [
    { label: "lifecycle.line.lab", gross: "2650.00", insurer: "1000.00", grant: "1000.00", copay: "650.00" },
    { label: "lifecycle.line.certificate", gross: "350.00", insurer: "0.00", grant: "150.00", copay: "200.00" },
  ], total: "3000.00", your_share: "850.00" });
});

test("family tokens redeem once, return only a condition, and expire in 24 hours", async () => {
  const condition = DATA.cohort.carriers[0].condition_id;
  const link = await api.cascade(condition);
  expect(await api.redeemCascade(link.token)).toEqual({ condition_id: condition });
  await expect(mock.redeemCascade(link.token)).rejects.toThrow("403");
  await expect(mock.redeemCascade("missing")).rejects.toThrow("403");
  const expired = await mock.cascade(condition);
  vi.advanceTimersByTime(86_400_000);
  await expect(mock.redeemCascade(expired.token)).rejects.toThrow("403");
  await expect(mock.cascade("unknown")).rejects.toThrow("422");
});
