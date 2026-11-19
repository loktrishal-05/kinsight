import { expect, test } from "vitest";
import texts from "../lib/fixtures/notifications.json";
import { changes, type Snapshot } from "../lib/notify";

const NOW = 1_800_000_000;
const base: Snapshot = { reviews: { couple_result: "pending" }, labStage: 2, bookingAt: null };
const all = { lab_status: true, counsellor_update: true, appointment_reminder: true, reclassification_reviewed: true, cascade_reminder: true };

test("nothing fires on the first look or without a change", () => {
  expect(changes(null, base, all, NOW)).toEqual([]);
  expect(changes(base, base, all, NOW)).toEqual([]);
});

test("a counsellor decision, a lab step and a session tomorrow each map to their type", () => {
  const next: Snapshot = { reviews: { couple_result: "approved" }, labStage: 3, bookingAt: NOW + 20 * 3600 };
  expect(changes(base, next, all, NOW).sort()).toEqual(["appointment_reminder", "counsellor_update", "lab_status"]);
});

test("only the types the person switched on are sent", () => {
  const next: Snapshot = { reviews: { couple_result: "approved" }, labStage: 3, bookingAt: null };
  expect(changes(base, next, { lab_status: true }, NOW)).toEqual(["lab_status"]);
  expect(changes(base, next, {}, NOW)).toEqual([]);
});

test("the texts carry no health information", () => {
  for (const t of [texts.title, ...Object.values(texts.types).map((v) => v.body)]) {
    expect(t.toLowerCase()).not.toMatch(/carrier|gene|variant|result|risk|condition|disorder|affected|diagnos|chance/);
  }
});
