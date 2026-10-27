// Plain-language learning content: one pack per language in content/<lang>.json (glossary, myths, talk starters, and Kin's text).
// Wording follows the approved-template rules (no directives, no blame, carrier is not a disease). Translations other than English
// are placeholders pending native-speaker and genetics review (docs/REVIEWS.md). A language without a pack falls back to English.
import ar from "@/content/ar.json";
import en from "@/content/en.json";
import hi from "@/content/hi.json";
import kn from "@/content/kn.json";
import ml from "@/content/ml.json";
import ta from "@/content/ta.json";
import te from "@/content/te.json";
import languages from "@/messages/languages.json";

export type Pack = typeof en;
export const CONTENT = { en, ar, hi, kn, ml, ta, te } as unknown as Record<string, Pack>;
/** A text in every listed language (missing translations fall back to English), so `text[lang]` always works. */
export type Text = Record<string, string>;
const CODES = (languages as { code: string }[]).map((l) => l.code);
const by = (get: (p: Pack) => string | undefined): Text => Object.fromEntries(CODES.map((c) => [c, (CONTENT[c] && get(CONTENT[c])) || get(en)!]));

export const GLOSSARY: { id: string; term: Text; meaning: Text }[] = Object.keys(en.glossary).map((id) => ({
  id,
  term: by((p) => (p.glossary as Record<string, { term: string }>)[id]?.term),
  meaning: by((p) => (p.glossary as Record<string, { meaning: string }>)[id]?.meaning),
}));
export const MYTHS: { myth: Text; fact: Text }[] = en.myths.map((_, i) => ({ myth: by((p) => p.myths[i]?.myth), fact: by((p) => p.myths[i]?.fact) }));
export const TALK_STARTERS: { id: string; text: Text }[] = Object.keys(en.talk).map((id) => ({ id, text: by((p) => (p.talk as Record<string, string>)[id]) }));
