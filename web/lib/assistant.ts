// Kin, the assistant: a deterministic, read-only, consent-aware helper. No model is called and nothing is stored on a server.
// The refusal rules mirror services/agents/copilot.py and are checked against the same 109-prompt red-team set (tests/assistant.test.ts).
// It answers from reviewed text only (the person's own verified explanation, the glossary, the consent summary) and refuses
// anything about other people, decisions, clinical advice, bulk data, or attempts to change its rules.
// Arabic strings are placeholders pending native-speaker review (docs/REVIEWS.md).
import { GLOSSARY, MYTHS } from "./learn";

export type Lang = "en" | "ar";
export type Link = { label: string; href: string };
export type Reply = { text: string; lang: Lang; refused: boolean; code: string; links: Link[]; sources: string[] };
export type Ctx = { uiLang: Lang; ownBlocks: string[]; consents: string[] };

const MAX_LEN = 2000;
const BIDI = /[‎‏]/g;
export const normalise = (s: string) => s.normalize("NFKC").slice(0, MAX_LEN).replace(BIDI, "");

/** Language of what the person wrote: Arabic script wins; otherwise fall back to the interface language. */
export function detectLang(text: string, fallback: Lang): Lang {
  const ar = (text.match(/[؀-ۿ]/g) ?? []).length;
  const la = (text.match(/[A-Za-z]/g) ?? []).length;
  if (ar === 0 && la === 0) return fallback;
  return ar >= la ? "ar" : "en";
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

const REFUSAL: Record<Lang, string> = {
  en: "I can only help with your own result. I cannot share other people's information, give medical advice, or tell you what to decide. A genetic counsellor can talk this through with you.",
  ar: "أستطيع المساعدة في نتيجتك أنت فقط. لا أستطيع مشاركة معلومات الآخرين أو تقديم نصيحة طبية أو إخبارك بما تقرر. يمكن لمستشار وراثي مناقشة ذلك معك.",
};

const PAGES: { href: string; en: string; ar: string; en_re: RegExp; ar_re: RegExp }[] = [
  { href: "/result", en: "My result", ar: "نتيجتي", en_re: R("\\b(my )?results?\\b"), ar_re: R("نتيج") },
  { href: "/couple", en: "Couple view", ar: "عرض الزوجين", en_re: R("\\bcouple\\b"), ar_re: R("الزوجين|زوجين") },
  { href: "/understand", en: "Check understanding", ar: "التأكد من الفهم", en_re: R("\\b(quiz|understanding|questions?)\\b"), ar_re: R("اختبار|فهم") },
  { href: "/next", en: "Next steps", ar: "الخطوات التالية", en_re: R("next steps?|what happens next|journey|timeline|referral"), ar_re: R("الخطوات|التالي|إحالة") },
  { href: "/summary", en: "Take-home summary", ar: "ملخص للاحتفاظ", en_re: R("summary|print"), ar_re: R("ملخص|طباعة") },
  { href: "/family", en: "Family circle", ar: "دائرة العائلة", en_re: R("family|tree|invite"), ar_re: R("عائل|شجرة|دعوة") },
  { href: "/consents", en: "Consent centre", ar: "مركز الموافقات", en_re: R("consent|sharing|stop sharing"), ar_re: R("موافق|مشاركة") },
  { href: "/privacy", en: "Privacy centre", ar: "مركز الخصوصية", en_re: R("privacy|who (can )?(see|looked)"), ar_re: R("خصوصي") },
  { href: "/access", en: "Finding services", ar: "الوصول إلى الخدمات", en_re: R("services?|appointment|book|clinic|where (do|can) i (go|get)"), ar_re: R("خدمات|موعد|حجز|عيادة") },
  { href: "/learn", en: "Learn", ar: "تعلّم", en_re: R("learn|basics|glossary|myths?"), ar_re: R("تعلم|تعلّم|قاموس|مصطلح") },
  { href: "/methods", en: "Methods and evidence", ar: "المنهجية والأدلة", en_re: R("method|formula|how (is|are) .*(calculated|made)|evidence"), ar_re: R("منهج|معادل|كيف تحسب") },
];

// Words that identify each glossary term in a question. Whole-term aliases only, so generic words such as "result" never hijack a question.
const ALIASES: Record<string, Record<Lang, string[]>> = {
  gene: { en: ["gene"], ar: ["جين"] }, carrier: { en: ["carrier"], ar: ["حامل", "الحامل"] }, recessive: { en: ["recessive"], ar: ["متنحي", "الوراثة المتنحية"] },
  xlinked: { en: ["x-linked", "x linked", "x chromosome"], ar: ["إكس"] }, related: { en: ["being related", "related", "kinship"], ar: ["قرابة"] },
  estimate: { en: ["estimate"], ar: ["تقدير"] }, uncertain: { en: ["not clear", "unclear", "uncertain"], ar: ["غير واضح"] },
  confirmatory: { en: ["confirmatory"], ar: ["تأكيدي"] }, counsellor: { en: ["counsellor", "counselor"], ar: ["مستشار"] }, consent: { en: ["consent"], ar: ["موافقة", "الموافقة"] },
};

const T = {
  en: {
    greet: "Hello, I am Kin. I can explain your own result in plain words, explain terms, show who you share with, or take you to a page. I never tell anyone what to decide.",
    thanks: "You are welcome. Ask me anything about your own result any time.",
    help: "I can explain your own result, explain a term such as carrier or estimate, show who you share with, or open a page. What would you like?",
    noResult: "I do not have an explanation to read yet. Open My result first, then ask me again.",
    noShare: "You are not sharing anything right now.",
    sharing: "You are sharing: ",
    nav: "Opening ",
    counsellor: "A genetic counsellor can go through your result with you and answer questions. You can ask for one at any time, and what you do next is your choice.",
    family: "You can invite a relative so that they see only what you choose, and the family page has gentle ways to start the conversation. Nothing is shared without your agreement.",
    how: "KinSight explains a screening result in plain words, shows what it means for a couple, and keeps a counsellor in the loop. A computer program works out every number, and approved sentences explain it.",
    settings: "Use the gear icon at the top for dark mode, bigger text, high contrast and less motion. The EN and AR buttons switch language.",
    sick: "Being a carrier is not the same as having the condition. Most carriers have no sign of it.",
    chips: ["What does my result mean?", "What is a carrier?", "Who can see my results?", "How do I find a counsellor?"],
  },
  ar: {
    greet: "مرحبا، أنا كِن. أستطيع شرح نتيجتك بكلمات بسيطة وتوضيح المصطلحات وعرض من تشارك معهم أو فتح صفحة. ولا أخبر أحدا بما يقرر.",
    thanks: "عفوا. اسألني عن نتيجتك في أي وقت.",
    help: "أستطيع شرح نتيجتك أنت، أو توضيح مصطلح مثل حامل أو تقدير، أو عرض من تشارك معهم، أو فتح صفحة. ماذا تودّ؟",
    noResult: "ليس لدي شرح لأقرأه بعد. افتح نتيجتي أولا ثم اسألني مرة أخرى.",
    noShare: "أنت لا تشارك أي شيء الآن.",
    sharing: "أنت تشارك: ",
    nav: "جار فتح ",
    counsellor: "يمكن لمستشار وراثي مراجعة نتيجتك معك والإجابة عن أسئلتك. يمكنك طلب مستشار في أي وقت، وما تفعله لاحقا هو خيارك.",
    family: "يمكنك دعوة قريب ليرى ما تختاره فقط، وفي صفحة العائلة طرق لطيفة لبدء الحديث. لا يُشارك شيء دون موافقتك.",
    how: "يشرح كِنسايت نتيجة الفحص بكلمات بسيطة ويوضح معناها للزوجين ويُبقي المستشار في الصورة. يحسب برنامج كل رقم، وتشرحه جمل معتمدة.",
    settings: "استخدم أيقونة الترس في الأعلى للوضع الداكن وتكبير الخط والتباين العالي وتقليل الحركة. يبدّل زرا EN وAR اللغة.",
    sick: "أن تكون حاملا لا يعني أن لديك الحالة. معظم الحاملين لا تظهر عليهم علاماتها.",
    chips: ["ماذا تعني نتيجتي؟", "ما هو الحامل؟", "من يستطيع رؤية نتائجي؟", "كيف أجد مستشارا؟"],
  },
} as const;

export const suggestions = (l: Lang): readonly string[] => T[l].chips;

const reply = (lang: Lang, text: string, code: string, links: Link[] = [], sources: string[] = [], refused = false): Reply => ({ text, lang, refused, code, links, sources });

/** The whole assistant: pure, synchronous, testable. `ctx` carries only the caller's own, consent-filtered material. */
export function answer(input: string, ctx: Ctx): Reply {
  const text = normalise(input);
  const lang = detectLang(text, ctx.uiLang);
  const t = T[lang];
  for (const [code, re] of GUARDS) if (re.test(text)) return reply(lang, REFUSAL[lang], code, [], [], true);

  const low = text.toLowerCase();
  if (/^\s*(hi|hello|hey|salam|good (morning|evening))\b|^\s*(مرحبا|السلام|اهلا|أهلا|هلا)/i.test(text)) return reply(lang, t.greet, "greet");
  if (/\b(thanks?|thank you|cheers)\b|شكرا|شكراً|يعطيك/i.test(text)) return reply(lang, t.thanks, "thanks");

  // Navigation: "open / go to / take me to / where is ..."
  if (/\b(open|go to|take me|show me|where (is|can i find)|navigate|bring up)\b|افتح|خذني|اذهب|أين|وين/i.test(text)) {
    const page = PAGES.find((p) => (lang === "ar" ? p.ar_re : p.en_re).test(low));
    if (page) return reply(lang, `${t.nav}${page[lang]}.`, "navigate", [{ label: page[lang], href: page.href }]);
  }

  // Glossary: "what is a carrier", "what does estimate mean", "ما هو الحامل"
  if (/\b(what('?s| is| are| does)|define|meaning of|explain)\b|ما (هو|هي|معنى)|اشرح|ماذا يعني/i.test(text)) {
    const hit = GLOSSARY.find((g) => ALIASES[g.id][lang].some((w) => low.includes(w)));
    if (hit) return reply(lang, hit.meaning[lang], "term", [{ label: lang === "ar" ? "تعلّم" : "Learn", href: `/learn#${hit.id}` }], [`glossary:${hit.id}`]);
  }
  if (/carrier.*(sick|ill|disease|have the condition)|حامل.*(مريض|مصاب)/i.test(text)) return reply(lang, t.sick, "term", [], ["glossary:carrier"]);
  const myth = MYTHS.find((m) => m.myth[lang].toLowerCase().replace(/\.$/, "") === low.replace(/[?.!]+$/, ""));
  if (myth) return reply(lang, myth.fact[lang], "myth", [{ label: lang === "ar" ? "تعلّم" : "Learn", href: "/learn" }]);

  if (/\b(who can see|who sees|shared with|sharing|consents?|privacy|access)\b|من (يستطيع|يرى)|أشارك|موافق|خصوصي/i.test(text)) {
    return reply(lang, ctx.consents.length ? t.sharing + ctx.consents.join("; ") : t.noShare, "consents",
      [{ label: lang === "ar" ? "مركز الخصوصية" : "Privacy centre", href: "/privacy" }], ["consents"]);
  }
  if (/\b(counsellor|counselor|appointment|find a|talk to someone|services?|clinic|book)\b|مستشار|موعد|خدمات|عيادة/i.test(text)) {
    return reply(lang, t.counsellor, "counsellor", [{ label: lang === "ar" ? "الوصول إلى الخدمات" : "Finding services", href: "/access" }]);
  }
  if (/\b(family|relatives?|tell (them|my)|invite)\b|عائل|أخبر/i.test(text)) return reply(lang, t.family, "family", [{ label: lang === "ar" ? "دائرة العائلة" : "Family circle", href: "/family" }]);
  if (/what is kinsight|how does (this|it|kinsight) work|about (this|kinsight)|ما هو كِنسايت|كيف يعمل/i.test(text)) return reply(lang, t.how, "about", [{ label: lang === "ar" ? "المنهجية" : "Methods", href: "/methods" }]);
  if (/dark mode|text size|bigger text|contrast|language|arabic|english|حجم الخط|الوضع الداكن|اللغة/i.test(text)) return reply(lang, t.settings, "settings");

  // Own result: only the caller's own verified explanation is ever read out.
  if (/\b(my result|what does (it|this|that) mean|explain|what was found|understand|result)\b|نتيجتي|ماذا تعني|اشرح|ما وُجد|افهم/i.test(text)) {
    return ctx.ownBlocks.length
      ? reply(lang, ctx.ownBlocks.slice(0, 4).join(" "), "explain_result", [{ label: lang === "ar" ? "نتيجتي" : "My result", href: "/result" }], ["explanation"])
      : reply(lang, t.noResult, "explain_result", [{ label: lang === "ar" ? "نتيجتي" : "My result", href: "/result" }]);
  }
  if (PAGES.some((p) => (lang === "ar" ? p.ar_re : p.en_re).test(low)) && low.split(/\s+/).length <= 3) {
    const page = PAGES.find((p) => (lang === "ar" ? p.ar_re : p.en_re).test(low))!;
    return reply(lang, `${t.nav}${page[lang]}.`, "navigate", [{ label: page[lang], href: page.href }]);
  }
  return reply(lang, t.help, "help");
}
