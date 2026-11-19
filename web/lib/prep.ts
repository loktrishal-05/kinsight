import { z } from "zod";
import bank from "./fixtures/prep_bank.json";

export const STAGES = ["premarital", "preconception", "pregnant"] as const;
export const CONCERNS = ["family_reaction", "future_children", "cost", "religion", "privacy"] as const;
export const SECTIONS = ["values", "concerns", "questions", "bring"] as const;
export const BRING = ["report", "id", "partner", "family_history"] as const;
export type Stage = typeof STAGES[number];
export type Concern = typeof CONCERNS[number];
export type Section = typeof SECTIONS[number];

export const QuestionS = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/), text: z.string().min(1).max(300) });
export const SheetS = z.object({
  stage: z.enum(STAGES), values: z.array(z.string()).max(10), concerns: z.array(z.enum(CONCERNS)).max(5), worries_text: z.string().max(1000),
  questions: z.array(QuestionS).max(30), bring: z.array(z.enum(BRING)).max(4), share: z.array(z.enum(SECTIONS)).max(4),
});
export type Sheet = z.infer<typeof SheetS>;
export const SuggestionsS = z.object({
  questions: z.array(QuestionS), concerns: z.record(z.string(), z.string()), bring: z.record(z.string(), z.string()), placeholder: z.boolean(),
});
export const SavedS = z.object({ status: z.literal("saved") });
export const MineS = z.object({ sheet: SheetS.nullable() });
export const ReviewS = z.object({ sections: z.record(z.string(), z.unknown()), shared: z.array(z.enum(SECTIONS)) });
export type Review = z.infer<typeof ReviewS>;

export const EMPTY: Sheet = { stage: "premarital", values: [], concerns: [], worries_text: "", questions: [], bring: [], share: [] };

// Mock mode only: the same ordering as services/agents/prep.py (general, stage, tier, then ticked concerns in a fixed order).
export function suggest(lang: string, stage: Stage, concerns: Concern[], tier?: number) {
  const placeholder = !(lang in bank), data = (bank as any)[placeholder ? "en" : lang];
  const groups: [string, string[]][] = [["general", data.general], [stage, data.stage[stage]]];
  if (tier === 1 || tier === 2 || tier === 3) groups.push([`tier${tier}`, data.tier[String(tier)]]);
  for (const c of CONCERNS) if (concerns.includes(c)) groups.push([c, data.concern[c]]);
  return { questions: groups.flatMap(([g, texts]) => texts.map((text, i) => ({ id: `${g}_${i}`, text }))), concerns: data.concerns, bring: data.bring, placeholder };
}

// Only the switched-on sections, as the API returns them to the counsellor.
export function shared(sheet: Sheet): Review {
  const keep: Record<Section, (keyof Sheet)[]> = { values: ["values"], concerns: ["concerns", "worries_text"], questions: ["questions"], bring: ["bring"] };
  const sections: Record<string, unknown> = {};
  for (const s of SECTIONS) if (sheet.share.includes(s)) for (const k of keep[s]) sections[k] = sheet[k];
  return { sections, shared: [...sheet.share].sort() as Section[] };
}
