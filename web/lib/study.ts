// Volunteer comprehension study (docs/study/protocol.md). Responses stay on the facilitator's device (localStorage) until the
// facilitator exports them; nothing is sent to a server and no name, contact or health detail is ever asked for.
import { DATA, scenarioById, type QuizQ } from "./fixtures";

export type Level = "basic" | "standard";
export type StudyResponse = {
  study_id: string; language: string; reading_level: Level; case_id: string;
  answers: Record<string, string>; correct: number; total: number; passed: boolean; missed: string[];
  clarity: number | null; started_at: string; finished_at: string;
};

const KEY = "ks_study_responses";

export function loadResponses(): StudyResponse[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export function saveResponse(r: StudyResponse) {
  try { localStorage.setItem(KEY, JSON.stringify([...loadResponses(), r])); } catch { /* private mode: the facilitator is warned on the results page */ }
}
export function clearResponses() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Random, meaningless id (no link to a person). */
export const newStudyId = () => "S-" + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();

/** Reading level: the facilitator may fix it (?level=); otherwise alternate so both levels fill evenly in each language. */
export function assignLevel(language: string, fixed: string | null): Level {
  if (fixed === "basic" || fixed === "standard") return fixed;
  const done = loadResponses().filter((r) => r.language === language);
  return done.filter((r) => r.reading_level === "basic").length <= done.filter((r) => r.reading_level === "standard").length ? "basic" : "standard";
}

/** The case and its texts in the participant's language (falls back to English). Case s3 (related couple, tier 3) by default. */
export function studyCase(caseId: string | null, language: string, level: Level) {
  const s = scenarioById(caseId ?? "s3");
  const blocks = s.explanations[`${language}/${level}`] ?? s.explanations[`en/${level}`];
  const quiz: QuizQ[] = s.quiz[language] ?? s.quiz.en;
  return { id: s.id, blocks, quiz };
}

/** Same rule as the app's teach-back check (configs/case.yaml pass_min 5 = every question right). */
export function grade(quiz: QuizQ[], answers: Record<string, string>) {
  const missed = quiz.filter((q) => answers[q.id] !== q.answer).map((q) => q.id);
  return { correct: quiz.length - missed.length, total: quiz.length, passed: missed.length === 0, missed };
}

/** Mirror of services/analytics/comprehension.summarise: pass rate per language x level and the largest gap. */
export function summarise(rows: StudyResponse[], targetGap = 10) {
  const groups = new Map<string, boolean[]>();
  for (const r of rows) {
    const k = `${r.language}|${r.reading_level}`;
    groups.set(k, [...(groups.get(k) ?? []), r.passed]);
  }
  const out = [...groups.entries()].sort().map(([k, v]) => {
    const [language, reading_level] = k.split("|");
    return { language, reading_level, n: v.length, pass_rate: Math.round((1000 * v.filter(Boolean).length) / v.length) / 10 };
  });
  const rates = out.map((g) => g.pass_rate);
  const gap = rates.length > 1 ? Math.round(10 * (Math.max(...rates) - Math.min(...rates))) / 10 : 0;
  const missed = new Map<string, number>();
  for (const r of rows) for (const q of r.missed) missed.set(q, (missed.get(q) ?? 0) + 1);
  return { total: rows.length, groups: out, gap_points: gap, target_gap_points: targetGap,
    most_missed: [...missed.entries()].sort((a, b) => b[1] - a[1]) };
}

const COLS = ["study_id", "language", "reading_level", "case_id", "correct", "total", "passed", "clarity", "missed", "started_at", "finished_at"] as const;
export function toCSV(rows: StudyResponse[]) {
  const cell = (v: unknown) => { const s = Array.isArray(v) ? v.join(" ") : v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
  return [COLS.join(","), ...rows.map((r) => COLS.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}

export const QUESTION_IDS = DATA.scenarios[2].quiz.en.map((q) => q.id);
