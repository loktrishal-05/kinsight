import { describe, expect, test } from "vitest";
import { grade, studyCase, summarise, toCSV, type StudyResponse } from "../lib/study";

const row = (language: string, level: "basic" | "standard", passed: boolean, missed: string[] = []): StudyResponse => ({
  study_id: "S-0", language, reading_level: level, case_id: "s3", answers: {}, correct: passed ? 5 : 4, total: 5, passed, missed,
  clarity: passed ? 5 : null, started_at: "2026-11-01T10:00:00Z", finished_at: "2026-11-01T10:05:00Z",
});

describe("volunteer study", () => {
  test("every language has its own explanation and a five-question check", () => {
    for (const lang of ["en", "ar", "hi", "ta", "te", "kn", "ml"]) {
      const c = studyCase("s3", lang, "basic");
      expect(c.blocks.length, lang).toBeGreaterThan(2);
      expect(c.quiz.length, lang).toBe(5);
      expect(c.quiz.every((q) => q.options.some((o) => o.id === q.answer)), lang).toBe(true);
    }
  });
  test("a pass means every answer right on the first try", () => {
    const quiz = studyCase("s3", "en", "basic").quiz;
    const right = Object.fromEntries(quiz.map((q) => [q.id, q.answer]));
    expect(grade(quiz, right)).toMatchObject({ correct: 5, total: 5, passed: true, missed: [] });
    const wrong = { ...right, [quiz[0].id]: "zz" };
    expect(grade(quiz, wrong)).toMatchObject({ correct: 4, passed: false, missed: [quiz[0].id] });
  });
  test("summary mirrors the Python analytics: pass rate per group and the largest gap", () => {
    const s = summarise([row("en", "basic", true), row("en", "basic", false, ["q_a"]), row("hi", "standard", true), row("hi", "standard", true)]);
    expect(s.groups).toEqual([{ language: "en", reading_level: "basic", n: 2, pass_rate: 50 }, { language: "hi", reading_level: "standard", n: 2, pass_rate: 100 }]);
    expect(s.gap_points).toBe(50);
    expect(s.most_missed).toEqual([["q_a", 1]]);
  });
  test("CSV has the header the analysis script reads, and quotes awkward values", () => {
    const csv = toCSV([row("en", "basic", false, ["q_a", "q_b"])]).trim().split("\n");
    expect(csv[0]).toBe("study_id,language,reading_level,case_id,correct,total,passed,clarity,missed,started_at,finished_at");
    expect(csv[1]).toBe("S-0,en,basic,s3,4,5,false,,q_a q_b,2026-11-01T10:00:00Z,2026-11-01T10:05:00Z");
  });
});
