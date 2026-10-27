// Kin, the assistant: a deterministic, read-only, consent-aware helper. No model is called and nothing is stored on a server.
// The refusal rules mirror services/agents/copilot.py and are checked against the same 109-prompt red-team set (tests/assistant.test.ts).
// It answers from reviewed text only (the person's own verified explanation, the glossary, the consent summary) and refuses
// anything about other people, decisions, clinical advice, bulk data, or attempts to change its rules.
// Its text comes from the language packs in content/<lang>.json (translations are placeholders pending native-speaker review,
// docs/REVIEWS.md). English and Arabic use the regex rules below; other languages add their pack's keyword lists, and the English and
// Arabic safety guards always run as well, so a mixed-language question is still refused.
import { CONTENT, GLOSSARY, MYTHS, type Pack } from "./learn";

export type Lang = string;
export type Link = { label: string; href: string };
export type Reply = { text: string; lang: Lang; refused: boolean; code: string; links: Link[]; sources: string[] };
export type Ctx = { uiLang: Lang; ownBlocks: string[]; consents: string[] };

const MAX_LEN = 2000;
const BIDI = /[‎‏]/g;
export const normalise = (s: string) => s.normalize("NFKC").slice(0, MAX_LEN).replace(BIDI, "");

// Script ranges for the languages Kin speaks; Latin letters mean English.
const SCRIPTS: [Lang, RegExp][] = [["ar", /[؀-ۿ]/g], ["hi", /[ऀ-ॿ]/g], ["ta", /[஀-௿]/g], ["te", /[ఀ-౿]/g], ["kn", /[ಀ-೿]/g], ["ml", /[ഀ-ൿ]/g], ["en", /[A-Za-z]/g]];

/** Language of what the person wrote: the script with the most letters wins (ties go to the non-Latin script); none means the interface language. */
export function detectLang(text: string, fallback: Lang): Lang {
  let best: Lang = fallback, most = 0;
  for (const [lang, re] of SCRIPTS) {
    const n = (text.match(re) ?? []).length;
    if (n > most) { best = lang; most = n; }
  }
  return best;
}

const R = (p: string) => new RegExp(p, "i");
// Order matters: injection and bulk first. Same rules as the Python guard.
const GUARDS: [string, RegExp][] = [
  ["injection", R("ignore (all |any |the )?(previous|prior|above|your)|system prompt|developer mode|jailbreak|you are now|act as|pretend|reveal (your|the) (instructions|prompt|rules)|override|disregard|<\\s*/?\\s*(system|tool)|\\[\\s*tool\\s*\\]|call get_|تجاهل|تعليمات النظام|تصرف ك")],
  ["bulk", R("\\b(export|download|dump|everyone|all (users|people|patients|results|data)|list of|database|csv|json)\\b|كل (المستخدمين|الأشخاص|النتائج|البيانات)|تصدير|قاعدة البيانات")],
  ["other_person", R("\\b(partner|husband|wife|fianc[a-z]*|spouse|brother|sister|mother|father|mom|dad|cousin|uncle|aunt|relative|neighbou?r|friend|him|his|her|hers|their|other person|someone else|who else|anyone else|another couple|other couple|other people|my (son|daughter|child))\\b|شريك|زوجي|زوجتي|خطيب|أخي|أختي|أمي|أبي|ابن عمي|قريب|جار|صديق|شخص آخر")],
  ["decision", R("\\b(should (i|we)|must (i|we)|decide|yes or no|marry\\w*|marriage|wedding|divorce|break up|cancel|have (a )?(baby|babies|children|kids)|get pregnant|abort|terminate|advise|recommend|what would you do|is it safe to|is it ok(ay)? to|go ahead)\\b|هل (أتزوج|نتزوج|ننجب|نلغي)|تزوج|زواج|طلاق|أنصحني|توصي|إجهاض")],
  ["clinical", R("\\b(diagnos|treat(ment)?|cure|medic(ine|ation)|drug|dose|symptom|therapy|surgery|prescri)\\w*|تشخيص|علاج|دواء|أعراض|جرعة")],
];

const PAGES: { href: string; en_re: RegExp; ar_re: RegExp }[] = [
  { href: "/result", en_re: R("\\b(my )?results?\\b"), ar_re: R("نتيج") },
  { href: "/couple", en_re: R("\\bcouple\\b"), ar_re: R("الزوجين|زوجين") },
  { href: "/understand", en_re: R("\\b(quiz|understanding|questions?)\\b"), ar_re: R("اختبار|فهم") },
  { href: "/next", en_re: R("next steps?|what happens next|journey|timeline|referral"), ar_re: R("الخطوات|التالي|إحالة") },
  { href: "/summary", en_re: R("summary|print"), ar_re: R("ملخص|طباعة") },
  { href: "/family", en_re: R("family|tree|invite"), ar_re: R("عائل|شجرة|دعوة") },
  { href: "/consents", en_re: R("consent|sharing|stop sharing"), ar_re: R("موافق|مشاركة") },
  { href: "/privacy", en_re: R("privacy|who (can )?(see|looked)"), ar_re: R("خصوصي") },
  { href: "/access", en_re: R("services?|appointment|book|clinic|where (do|can) i (go|get)"), ar_re: R("خدمات|موعد|حجز|عيادة") },
  { href: "/learn", en_re: R("learn|basics|glossary|myths?"), ar_re: R("تعلم|تعلّم|قاموس|مصطلح") },
  { href: "/methods", en_re: R("method|formula|how (is|are) .*(calculated|made)|evidence"), ar_re: R("منهج|معادل|كيف تحسب") },
];

type Kin = Pack["kin"] & { words: Record<string, string[]>; pageWords: Record<string, string[]>; aliases: Record<string, string[]>; pages: Record<string, string> };
const pack = (lang: Lang): Kin => (CONTENT[lang] ?? CONTENT.en).kin as Kin;
/** Keyword match for languages without regex rules (Indic scripts have no word boundaries for \b, so this is a substring test). */
const said = (lang: Lang, low: string, key: string) =>
  lang !== "en" && lang !== "ar" && (pack(lang).words[key] ?? []).some((w) => w && low.includes(w.toLowerCase()));
const pageFor = (lang: Lang, low: string) =>
  lang === "en" || lang === "ar" ? PAGES.find((p) => (lang === "ar" ? p.ar_re : p.en_re).test(low))
    : PAGES.find((p) => (pack(lang).pageWords[p.href] ?? []).some((w) => w && low.includes(w.toLowerCase())));

export const suggestions = (l: Lang): readonly string[] => pack(l).chips;

const reply = (lang: Lang, text: string, code: string, links: Link[] = [], sources: string[] = [], refused = false): Reply => ({ text, lang, refused, code, links, sources });

/** The whole assistant: pure, synchronous, testable. `ctx` carries only the caller's own, consent-filtered material. */
export function answer(input: string, ctx: Ctx): Reply {
  const text = normalise(input);
  const lang = detectLang(text, ctx.uiLang);
  const t = pack(lang), label = (href: string) => t.pages[href];
  const low = text.toLowerCase();
  for (const [code, re] of GUARDS) if (re.test(text) || said(lang, low, `guard_${code}`)) return reply(lang, t.refusal, code, [], [], true);

  if (/^\s*(hi|hello|hey|salam|good (morning|evening))\b|^\s*(مرحبا|السلام|اهلا|أهلا|هلا)/i.test(text) || said(lang, low, "greet")) return reply(lang, t.greet, "greet");
  if (/\b(thanks?|thank you|cheers)\b|شكرا|شكراً|يعطيك/i.test(text) || said(lang, low, "thanks")) return reply(lang, t.thanks, "thanks");

  // Navigation: "open / go to / take me to / where is ..."
  if (/\b(open|go to|take me|show me|where (is|can i find)|navigate|bring up)\b|افتح|خذني|اذهب|أين|وين/i.test(text) || said(lang, low, "nav")) {
    const page = pageFor(lang, low);
    if (page) return reply(lang, `${t.nav}${label(page.href)}.`, "navigate", [{ label: label(page.href), href: page.href }]);
  }

  // Glossary: "what is a carrier", "what does estimate mean", "ما هو الحامل"
  if (/\b(what('?s| is| are| does)|define|meaning of|explain)\b|ما (هو|هي|معنى)|اشرح|ماذا يعني/i.test(text) || said(lang, low, "define")) {
    const hit = GLOSSARY.find((g) => (t.aliases[g.id] ?? []).some((w) => w && low.includes(w.toLowerCase())));
    if (hit) return reply(lang, hit.meaning[lang], "term", [{ label: label("/learn"), href: `/learn#${hit.id}` }], [`glossary:${hit.id}`]);
  }
  if (/carrier.*(sick|ill|disease|have the condition)|حامل.*(مريض|مصاب)/i.test(text) || said(lang, low, "sick")) return reply(lang, t.sick, "term", [], ["glossary:carrier"]);
  const myth = MYTHS.find((m) => m.myth[lang].toLowerCase().replace(/[.।]$/, "") === low.replace(/[?.!।]+$/, ""));
  if (myth) return reply(lang, myth.fact[lang], "myth", [{ label: label("/learn"), href: "/learn" }]);

  if (/\b(who can see|who sees|shared with|sharing|consents?|privacy|access)\b|من (يستطيع|يرى)|أشارك|موافق|خصوصي/i.test(text) || said(lang, low, "consents")) {
    return reply(lang, ctx.consents.length ? t.sharing + ctx.consents.join("; ") : t.noShare, "consents",
      [{ label: label("/privacy"), href: "/privacy" }], ["consents"]);
  }
  if (/\b(counsellor|counselor|appointment|find a|talk to someone|services?|clinic|book)\b|مستشار|موعد|خدمات|عيادة/i.test(text) || said(lang, low, "counsellor")) {
    return reply(lang, t.counsellor, "counsellor", [{ label: label("/access"), href: "/access" }]);
  }
  if (/\b(family|relatives?|tell (them|my)|invite)\b|عائل|أخبر/i.test(text) || said(lang, low, "family")) return reply(lang, t.family, "family", [{ label: label("/family"), href: "/family" }]);
  if (/what is kinsight|how does (this|it|kinsight) work|about (this|kinsight)|ما هو كِنسايت|كيف يعمل/i.test(text) || said(lang, low, "about")) return reply(lang, t.how, "about", [{ label: label("/methods"), href: "/methods" }]);
  if (/dark mode|text size|bigger text|contrast|language|arabic|english|حجم الخط|الوضع الداكن|اللغة/i.test(text) || said(lang, low, "settings")) return reply(lang, t.settings, "settings");

  // Own result: only the caller's own verified explanation is ever read out.
  if (/\b(my result|what does (it|this|that) mean|explain|what was found|understand|result)\b|نتيجتي|ماذا تعني|اشرح|ما وُجد|افهم/i.test(text) || said(lang, low, "result")) {
    return ctx.ownBlocks.length
      ? reply(lang, ctx.ownBlocks.slice(0, 4).join(" "), "explain_result", [{ label: label("/result"), href: "/result" }], ["explanation"])
      : reply(lang, t.noResult, "explain_result", [{ label: label("/result"), href: "/result" }]);
  }
  const page = pageFor(lang, low);
  if (page && low.split(/\s+/).length <= 3) {
    return reply(lang, `${t.nav}${label(page.href)}.`, "navigate", [{ label: label(page.href), href: page.href }]);
  }
  return reply(lang, t.help, "help");
}
