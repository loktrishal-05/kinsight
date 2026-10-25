// Typed access to the generated fixtures (scripts/export_web_fixtures.py). Fictional data only.
import raw from "./data.json";

export type Finding = { condition_id: string; formula_id: string; risk_affected: number | null; note_codes: string[];
  inputs: Record<string, number>; inheritance: "AR" | "XLR"; status_a: string; status_b: string };
export type QuizQ = { id: string; text: string; options: { id: string; text: string }[]; answer: string };
export type Scenario = {
  id: string; title: { en: string; ar: string }; blurb: { en: string; ar: string }; tier: 1 | 2 | 3; related: boolean; kinship_phi: number;
  engine_version: string; config_hash: string; findings: Finding[];
  results_a: { condition_id: string; status: "carrier" | "not_detected" | "uncertain" }[];
  results_b: { condition_id: string; status: "carrier" | "not_detected" | "uncertain" }[];
  explanations: Record<string, string[]>; quiz: Record<string, QuizQ[]>;
};
export type CarrierRow = { condition_id: string; label_en: string; label_ar: string; inheritance: "AR" | "XLR"; tier: number; carriers: number; uncertain: number };
export type QueueRow = { id: string; tier: 1 | 2 | 3; status: string; due_days: number; language: string; reading_level: string; age_band: string;
  related: boolean; conditions: number; step: string };
export type CapacityRow = { slots: number; policy: string; median_days: number; p95_days: number; tier3_within_window: number };

export const DATA = raw as unknown as {
  label: string; scenarios: Scenario[];
  cohort: { persons: number; couples: number; conditions: number; carriers: CarrierRow[]; tiers: Record<string, number>;
    tiers_by_language: Record<string, Record<string, number>>; related_share: number; manifest: any };
  queue: QueueRow[];
  capacity: { assumptions: any; grid: CapacityRow[]; weekly: { week: number; served: number; median_wait: number | null }[]; label: string };
  comprehension: { cells: { language: string; level: string; age_band: string; n: number; pass_rate: number }[]; gap_points: number; target_gap_points: number; label: string };
};

export const conditionLabel = (id: string, lang: string) => {
  const c = DATA.cohort.carriers.find((x) => x.condition_id === id);
  return c ? (lang === "ar" ? c.label_ar : c.label_en) : id;
};
export const scenarioById = (id: string) => DATA.scenarios.find((s) => s.id === id) ?? DATA.scenarios[2];
