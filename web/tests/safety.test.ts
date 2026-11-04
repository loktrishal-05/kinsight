import { beforeEach, expect, test, vi, afterEach } from "vitest";
import { mock } from "../lib/mock";
import { api } from "../lib/api";
import { real } from "../lib/real";
import { geneCall, triagePreset, TRIAGE_PRESETS } from "../lib/safety";
import en from "../messages/en.json";
import { readFileSync } from "node:fs";

beforeEach(() => mock.reset());
afterEach(() => vi.restoreAllMocks());

test("all triage presets return fixed demo chances and applicable rules", async () => {
  for (const preset of TRIAGE_PRESETS) {
    const result = await api.triage(triagePreset(preset));
    expect(result.combined_risk_pct).toBe(preset === "none" ? 0 : preset === "multi" ? 43.75 : 25);
    expect(result.tier).toBe(preset === "none" ? 1 : 3);
    expect(result.hold_release).toBe(preset === "pending");
    expect(result.private_counts).toEqual({ a: 0, b: 0 });
    for (const rule of result.rules) expect(en).toHaveProperty(`safety.rule.${rule}`);
  }
  expect((await api.triage(triagePreset("compound"))).rules).toContain("RULE-05_COMPOUND_HET");
  expect((await api.triage(triagePreset("multi"))).rules).toContain("RULE-02_MULTI_GENE");
  expect((await api.triage(triagePreset("pregnancy"))).sla_hours).toBe(24);
  const result = await api.triage({ ...triagePreset("none"), a: [geneCall("PRIVATE")], phi: 0.0625, dcs: 50 });
  expect(result.rules).toEqual(["RULE-04_PRIVATE_FINDING", "RULE-06_CONSANGUINITY_REFLEX", "RULE-08_DECISIONAL_SUPPORT"]);
  expect(result.private_counts).toEqual({ a: 1, b: 0 });
  expect(result.shared_genes).toEqual([]);
});

test("check-in validates instruments and offers neutral support with fixed demo scores", async () => {
  expect(await api.checkin({ instrument: "dcs", answers: Array(16).fill(4), total: null })).toEqual({ score: 50, flagged: true, support_offered: true });
  expect(await api.checkin({ instrument: "low_literacy_dcs", answers: Array(10).fill("yes"), total: null })).toEqual({ score: 0, flagged: false, support_offered: false });
  expect((await api.checkin({ instrument: "low_literacy_dcs", answers: Array(10).fill("unsure"), total: null })).support_offered).toBe(true);
  expect((await api.checkin({ instrument: "pagis", answers: null, total: 50 })).flagged).toBe(true);
  await expect(mock.checkin({ instrument: "dcs", answers: [7], total: null })).rejects.toThrow();
  await expect(api.checkin({ instrument: "pagis", answers: null, total: null })).rejects.toThrow();
});

test("vault separates PIN views, rejects mismatches, isolates personas and resets", async () => {
  await mock.login("person_a");
  await api.safeVault({ pin: "1234", decoy_pin: "5678" });
  expect(await api.unlockVault({ pin: "1234" })).toEqual({ view: "real" });
  expect(await api.unlockVault({ pin: "5678" })).toEqual({ view: "decoy" });
  await expect(api.unlockVault({ pin: "9999" })).rejects.toThrow("403");
  await expect(mock.safeVault({ pin: "1234", decoy_pin: "1234" })).rejects.toThrow();
  await mock.login("person_b");
  await expect(mock.unlockVault({ pin: "1234" })).rejects.toThrow("403");
  await mock.login("person_a");
  await api.safeVault({ pin: "4321", decoy_pin: "8765" });
  await expect(mock.unlockVault({ pin: "1234" })).rejects.toThrow("403");
  mock.reset();
  await expect(mock.unlockVault({ pin: "4321" })).rejects.toThrow("403");
});

test("Whisper exposes only queued status and validates the contact", async () => {
  expect(await api.whisper({ contact: "+971500000000", gene_family: "HBB" })).toEqual({ status: "queued" });
  await expect(mock.whisper({ contact: "", gene_family: "HBB" })).rejects.toThrow();
});

test("reclassification ignores unchanged and missing variants and requires review", async () => {
  expect(await api.reclassify({ archived: { up: 3, down: 5, same: 2, absent: 3 }, feed: { up: 5, down: 2, same: 2, added: 4 } })).toEqual({ alerts: [
    { variant: "up", from: 3, to: 5, direction: "upgraded", needs_clinician_review: true },
    { variant: "down", from: 5, to: 2, direction: "downgraded", needs_clinician_review: true },
  ] });
  await expect(mock.reclassify({ archived: { v: 6 }, feed: {} })).rejects.toThrow();
});

test("TAMM contains only completion fields; emergency access needs two distinct attestors", async () => {
  const notice = await api.tamm({ pairing_ref: "demo-pair", role: "counsellor" });
  expect(Object.keys(notice)).toEqual(["pairing_ref", "screening_completed", "counselling_completed", "signed_off_by_role", "issued_at"]);
  expect(notice).toMatchObject({ pairing_ref: "demo-pair", screening_completed: true, counselling_completed: true, signed_off_by_role: "counsellor" });
  expect((await api.tamm({ pairing_ref: "demo-pair", role: "pcp" })).counselling_completed).toBe(false);
  expect(await api.breakGlass({ attestors: ["one", "two"], reason: "Demo emergency" })).toEqual({ granted: true, attestors: ["one", "two"], alert_siem: true, notify_citizen: true });
  await expect(mock.breakGlass({ attestors: ["one", "one"], reason: "Demo" })).rejects.toThrow();
  await expect(mock.breakGlass({ attestors: ["one", "two"], reason: " " })).rejects.toThrow();
});

test("real adapters preserve JSON contract and use existing Bearer transport", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ access_token: "demo-token" }) } as Response);
  await real.login("counsellor");
  const cases = [
    ["triage", "triage", triagePreset("shared"), "POST"],
    ["whisper", "whisper", { contact: "+971500000000", gene_family: "HBB" }, "POST"],
    ["checkin", "checkin", { instrument: "pagis", answers: null, total: 40 }, "POST"],
    ["reclassify", "reclassify", { archived: { v: 3 }, feed: { v: 5 } }, "POST"],
    ["safeVault", "safe-vault", { pin: "1234", decoy_pin: "5678" }, "PUT"],
    ["unlockVault", "safe-vault/unlock", { pin: "1234" }, "POST"],
    ["tamm", "tamm", { pairing_ref: "demo-pair", role: "pcp" }, "POST"],
    ["breakGlass", "break-glass", { attestors: ["one", "two"], reason: "Demo" }, "POST"],
  ] as const;
  for (const [method, path, body, verb] of cases) {
    await (real[method] as (v: unknown) => Promise<unknown>)(body);
    expect(fetcher).toHaveBeenLastCalledWith(`/api/lifecycle/${path}`, { method: verb, body: JSON.stringify(body), headers: { "content-type": "application/json", authorization: "Bearer demo-token" } });
  }
});

test("every language includes the safety and navigation keys", () => {
  const keys = Object.keys(en).filter((k) => k.startsWith("safety.") || ["nav.checkin", "nav.clinic"].includes(k));
  for (const lang of ["ar", "hi", "kn", "ml", "ta", "te", "ur"]) {
    const messages = JSON.parse(readFileSync(new URL(`../messages/${lang}.json`, import.meta.url), "utf8"));
    for (const key of keys) { expect(messages[key]).toBeTypeOf("string"); expect(messages[key]).not.toMatch(/\?{2}/); }
  }
});
