// The guided demo: one narrated, self-driving step per concept. Each step can navigate, switch persona or language, and perform the
// real action on screen (click, type, answer) so the person watches the product work. Narration is bilingual; Arabic is a placeholder
// pending native-speaker review (docs/REVIEWS.md). Covers every page and feature (see COVERAGE and e2e/demo.spec.ts).
import { scenarioById } from "./fixtures";
import type { Persona } from "./session";

export type L = { en: string; ar: string };
const L = (en: string, ar: string): L => ({ en, ar });

export type Ctx = {
  lang: string;
  go: (href: string) => void;
  choose: (p: Persona) => Promise<void>;
  setLang: (l: string) => void;
  setLevel: (l: "basic" | "standard") => void;
  setTheme: (t: "light" | "dark") => void;
  setText: (n: 0 | 1 | 2) => void;
  api: typeof import("./api").api;
  log: (note: string) => void;
};

export type Step = {
  id: string;
  route?: string;
  persona?: Persona;
  target?: string;            // data-demo value to spotlight
  covers: string[];           // feature keys shown on the final checklist
  title: L;
  text: L;
  run?: (c: Ctx) => Promise<void>;
};

// ---- DOM helpers used by steps (programmatic, so they work in any browser and need no extra permissions) ----
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const $ = (sel: string) => document.querySelector<HTMLElement>(sel);
export const demo = (name: string) => $(`[data-demo="${name}"]`);
export async function waitFor(sel: string, ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const el = $(sel); if (el) return el; await sleep(80); }
  return null;
}
export async function click(sel: string, ms = 5000) { const el = await waitFor(sel, ms); el?.click(); return !!el; }
export async function fill(sel: string, value: string) {
  const el = (await waitFor(sel)) as HTMLInputElement | null;
  if (!el) return false;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}
async function ask(c: Ctx, q: string) {
  await fill('[data-demo="kin-input"]', q);
  await sleep(300);
  ($('[data-demo="kin-form"]') as HTMLFormElement | null)?.requestSubmit();
  c.log(`kin:asked:${q}`);
}
async function answerQuiz(c: Ctx, wrongFirst: boolean) {
  const s = scenarioById(c.api.scenario());
  const qs = s.quiz[c.lang];
  await waitFor('[data-demo="quiz"]');
  for (const [i, q] of qs.entries()) {
    const wrong = q.options.find((o) => o.id !== q.answer)!;
    const pick = wrongFirst && i === 0 ? wrong.id : q.answer;
    await click(`input[name="${q.id}"][data-opt="${pick}"]`);
    await sleep(120);
  }
}

export const STEPS: Step[] = [
  { id: "intro", route: "/home", target: "hero", covers: ["landing"], title: L("Welcome to KinSight", "مرحبا بك في كِنسايت"),
    text: L("KinSight helps a couple understand an inherited-health screening result in plain words, with a human counsellor in the loop. Everything you will see is fictional.",
            "يساعد كِنسايت الزوجين على فهم نتيجة فحص صحي وراثي بكلمات بسيطة، مع بقاء مستشار بشري في الصورة. كل ما سترونه خيالي."),
    run: async (c) => { c.api.resetDemo(); c.api.setScenario("s3"); c.setTheme("light"); c.setText(0); c.setLevel("standard"); c.log("demo:reset"); } },
  { id: "how", route: "/home", target: "how", covers: ["journey-overview"], title: L("From result to the right next step", "من النتيجة إلى الخطوة المناسبة"),
    text: L("Five stages: the result arrives, you understand it, a counsellor reviews anything complex, you see your options with owners and dates, and you decide what to share with family.",
            "خمس مراحل: تصل النتيجة، ثم تفهمها، ثم يراجع مستشار أي أمر معقد، ثم ترى خياراتك مع المسؤولين والمواعيد، ثم تقرر ما تشاركه مع العائلة.") },
  { id: "cases", route: "/home", target: "cases", covers: ["scenarios"], title: L("Seven fictional cases", "سبع حالات خيالية"),
    text: L("These cases are computed by the real engine: unrelated or related couples, one or two carriers, an unclear result, an X-linked change. Each shows how the same product responds to a different situation.",
            "تحسب المحرك الحقيقي هذه الحالات: أزواج أقارب أو غير أقارب، حامل واحد أو اثنان، نتيجة غير واضحة، وتغير مرتبط بالكروموسوم إكس. تُظهر كل حالة كيف يستجيب المنتج لموقف مختلف.") },
  { id: "roles", route: "/home", target: "personas", covers: ["roles"], title: L("Seven roles, one product", "سبعة أدوار ومنتج واحد"),
    text: L("Two partners, a relative, a counsellor, an analyst, an auditor and a demo operator. Each role sees only what the privacy rules allow, and the side menu changes with the role.",
            "شريكان وقريب ومستشار ومحلل ومدقق ومشغل للعرض. يرى كل دور ما تسمح به قواعد الخصوصية فقط، وتتغير القائمة الجانبية حسب الدور.") },
  { id: "topbar", route: "/home", target: "topbar", covers: ["languages", "reading-level"], title: L("Language and reading level", "اللغة ومستوى القراءة"),
    text: L("Switch between English and Arabic, and between simple and standard wording. Explanations are pre-written at both levels, so nothing is invented on the fly.",
            "بدّل بين العربية والإنجليزية وبين الصياغة المبسطة والعادية. الشروحات مكتوبة مسبقا بالمستويين، فلا يُخترع شيء في الحال."),
    run: async (c) => { c.setLevel("basic"); await sleep(1200); c.setLevel("standard"); c.log("level:toggled"); } },
  { id: "learn-inherit", route: "/learn", target: "learn-inherit", covers: ["learn", "punnett"], title: L("Learn: how inheritance works", "تعلّم: كيف تعمل الوراثة"),
    text: L("When both parents carry one changed copy of a gene, each pregnancy has three possible outcomes. This standard teaching diagram makes the one-in-four idea visible.",
            "عندما يحمل كلا الوالدين نسخة متغيرة واحدة من جين، يكون لكل حمل ثلاث نتائج ممكنة. يجعل هذا الرسم التعليمي فكرة واحد من أربعة مرئية.") },
  { id: "learn-chance", route: "/learn", target: "learn-chance", covers: ["icon-array"], title: L("What a chance looks like", "كيف تبدو الفرصة"),
    text: L("Numbers are hard, so chances are also drawn as people out of one hundred. Below one percent, nobody is highlighted and we say so instead of rounding up.",
            "الأرقام صعبة، لذلك تُرسم الفرص أيضا كأشخاص من بين مئة. دون واحد بالمئة لا يُظلل أحد ونقول ذلك بدل التقريب لأعلى."),
    run: async (c) => { await click('[data-demo="chance-small"]'); await sleep(1500); await click('[data-demo="chance-half"]'); c.log("learn:chance-toggled"); } },
  { id: "learn-glossary", route: "/learn", target: "glossary", covers: ["myths", "glossary"], title: L("Myths, facts and a plain glossary", "خرافات وحقائق وقاموس بسيط"),
    text: L("Common worries are answered calmly, and a searchable glossary explains every term. Nobody is blamed and nothing here tells a couple what to decide.",
            "تُجاب المخاوف الشائعة بهدوء، ويشرح قاموس قابل للبحث كل مصطلح. لا يُلام أحد ولا يخبر شيء هنا الزوجين بما يقررانه."),
    run: async (c) => { await fill('[data-demo="glossary-search"]', "carrier"); c.log("learn:glossary-search"); } },
  { id: "palette", route: "/learn", target: "palette-dialog", covers: ["search"], title: L("Search everything", "ابحث في كل شيء"),
    text: L("Press Control and K anywhere to jump to a page, a glossary term or a demo case. It works by keyboard alone.",
            "اضغط Control وK في أي مكان للانتقال إلى صفحة أو مصطلح أو حالة تجريبية. تعمل بلوحة المفاتيح وحدها."),
    run: async (c) => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
      await waitFor('[data-demo="palette-dialog"]'); await sleep(500);
      await fill('[data-demo="palette-input"]', "privacy"); c.log("palette:opened");
    } },
  { id: "result", route: "/result", persona: "person_a", target: "results", covers: ["my-result", "neutral-wording"], title: L("My result, in neutral words", "نتيجتي بكلمات محايدة"),
    text: L("Person A sees what was found for them. The words are found and not found, and the colours are calm because a result is information, not a verdict.",
            "يرى الشخص أ ما وُجد له. الكلمات هي وُجد ولم يُوجد، وليست إيجابي أو سلبي، والألوان هادئة لأن النتيجة معلومة لا حكم."),
    run: async (c) => { c.log("persona:A"); } },
  { id: "explain", route: "/result", persona: "person_a", target: "explanation", covers: ["explanation", "read-aloud", "counselling-request"], title: L("A verified explanation", "شرح موثّق"),
    text: L("The explanation uses pre-approved sentences. The numbers come from the engine and a verifier checks every digit before anyone sees it. Read aloud is there for people who prefer to listen.",
            "يستخدم الشرح جملا معتمدة مسبقا. تأتي الأرقام من المحرك ويفحص مدقق كل رقم قبل أن يراه أحد. وخاصية القراءة بصوت عال لمن يفضل الاستماع."),
    run: async (c) => { await click('[data-demo="talk"]'); c.log("counselling:requested"); } },
  { id: "pool-a", route: "/couple", persona: "person_a", target: "steps", covers: ["consent-pooling"], title: L("The couple view needs both partners", "عرض الزوجين يحتاج الشريكين"),
    text: L("A couple figure uses both partners' results, so it exists only after both agree. Person A agrees now. Until the partner also agrees, nothing is shown and neither partner is told why.",
            "رقم الزوجين يستخدم نتيجتي الشريكين، فلا يوجد إلا بعد موافقتهما معا. يوافق الشخص أ الآن. وإلى أن يوافق الشريك لا يظهر شيء ولا يُخبر أحد بالسبب."),
    run: async (c) => { await click('[data-demo="share"]'); c.log("pooling:a"); } },
  { id: "pool-b", route: "/couple", persona: "person_b", target: "steps", covers: ["partner-view", "counsellor-gate"], title: L("The partner agrees; a counsellor reviews", "يوافق الشريك ويراجع المستشار"),
    text: L("Person B agrees too. Because this case is tier three, the figure stays hidden until a qualified counsellor has reviewed it with the couple.",
            "يوافق الشخص ب أيضا. ولأن هذه الحالة من المستوى الثالث، يبقى الرقم مخفيا حتى يراجعه مستشار مؤهل مع الزوجين."),
    run: async (c) => { await click('[data-demo="share"]'); c.log("pooling:b"); } },
  { id: "counsellor", route: "/counsellor", persona: "counsellor", target: "workload", covers: ["counsellor-console", "workload"], title: L("The counsellor's console", "منصة المستشار"),
    text: L("The counsellor sees only assigned cases and only what each person consented to share. Workload counts show what is open, waiting and overdue.",
            "يرى المستشار الحالات المسندة إليه فقط وما وافق كل شخص على مشاركته. تُظهر العدادات ما هو مفتوح ومنتظر ومتأخر.") },
  { id: "queue", route: "/counsellor", persona: "counsellor", target: "queue", covers: ["queue-filters"], title: L("A queue that can be filtered", "قائمة قابلة للتصفية"),
    text: L("Twenty-seven sample cases from the demo cohort, sorted by tier and due date. Filter by tier, status or overdue, or search by case number.",
            "سبع وعشرون حالة نموذجية من المجموعة التجريبية، مرتبة حسب المستوى والموعد. صفِّ حسب المستوى أو الحالة أو التأخر أو ابحث برقم الحالة."),
    run: async (c) => { await click('[data-demo="tier-3"]'); await sleep(1500); await click('[data-demo="tier-all"]'); c.log("queue:filtered"); } },
  { id: "approve", route: "/counsellor", persona: "counsellor", target: "brief", covers: ["case-brief", "approve"], title: L("Brief, then a human decision", "ملخص ثم قرار بشري"),
    text: L("The brief lists findings and flags, each tied to a field of the assessment. The counsellor approves, edits or holds. Approving releases the result to the couple.",
            "يسرد الملخص النتائج والتنبيهات وكلٌّ مرتبط بحقل من التقييم. يوافق المستشار أو يعدّل أو يعلّق. الموافقة تتيح النتيجة للزوجين."),
    run: async (c) => { await click('[data-demo="approve"]'); await sleep(400); c.log("counsellor:approved"); } },
  { id: "close-needs-evidence", route: "/counsellor", persona: "counsellor", target: "referral", covers: ["referral-evidence"], title: L("A case cannot close without evidence", "لا تُغلق الحالة دون دليل"),
    text: L("Closing is refused unless there is recorded evidence or a counsellor decision. Every referral step has an owner and a due date, and nothing disappears silently.",
            "يُرفض الإغلاق ما لم يوجد دليل مسجل أو قرار من المستشار. لكل خطوة إحالة مسؤول وموعد، ولا يختفي شيء بصمت."),
    run: async (c) => { await click('[data-demo="close-case"]'); if (await waitFor('[data-demo="close-refused"]', 3000)) c.log("close:refused"); } },
  { id: "released", route: "/couple", persona: "person_a", target: "finding", covers: ["couple-view", "icon-array", "punnett"], title: L("Released: the couple view", "أُتيحت النتيجة: عرض الزوجين"),
    text: L("Now the couple sees the chance per pregnancy, drawn as people out of a hundred, with the inheritance diagram and a plain note that being related can raise the chance. It is an estimate, not a diagnosis.",
            "الآن يرى الزوجان الفرصة لكل حمل مرسومة كأشخاص من مئة مع مخطط الوراثة وملاحظة بسيطة بأن القرابة قد ترفع الفرصة. إنه تقدير وليس تشخيصا."),
    run: async (c) => { if (await waitFor('[data-demo="finding"]', 4000)) c.log("couple:released"); } },
  { id: "quiz-wrong", route: "/understand", persona: "person_a", target: "quiz", covers: ["teach-back", "gentle-reexplain"], title: L("A short check, never a test", "اختبار قصير وليس امتحانا"),
    text: L("Five questions check understanding. We answer one wrongly on purpose. The response is a gentler re-explanation, never a score shown as failure.",
            "خمسة أسئلة تتحقق من الفهم. نجيب عن أحدها خطأ عمدا. الاستجابة إعادة شرح ألطف وليست درجة تُعرض كفشل."),
    run: async (c) => { await answerQuiz(c, true); await sleep(400); await click('[data-demo="quiz-submit"]'); if (await waitFor('[data-testid="quiz-msg"]', 3000)) c.log("quiz:reexplain"); } },
  { id: "quiz-right", route: "/understand", persona: "person_a", target: "quiz-msg", covers: ["quiz-pass"], title: L("Second try, and it never loops", "المحاولة الثانية ولا تتكرر بلا نهاية"),
    text: L("After one re-explanation the couple answers again and passes. A second failure would offer a counsellor conversation instead of looping a third time.",
            "بعد إعادة شرح واحدة يجيب الزوجان مجددا وينجحان. وأي فشل ثان يعرض محادثة مع مستشار بدل التكرار مرة ثالثة."),
    run: async (c) => {
      await answerQuiz(c, false); await sleep(400); await click('[data-demo="quiz-submit"]');
      const msg = await waitFor('[data-demo="quiz-msg"][data-ok="true"]', 3000); if (msg) c.log("quiz:passed");
    } },
  { id: "journey", route: "/next", persona: "person_a", target: "journey", covers: ["journey", "options", "values"], title: L("The path from result to care", "المسار من النتيجة إلى الرعاية"),
    text: L("Counselling, confirmatory testing, specialist referral, closure. Options are listed with equal weight and reflective questions are never scored. What to do next is always the couple's choice.",
            "الاستشارة، الفحص التأكيدي، الإحالة إلى متخصص، الإغلاق. الخيارات بوزن متساوٍ والأسئلة التأملية لا تُقيَّم أبدا. ما يُفعل لاحقا هو دائما خيار الزوجين.") },
  { id: "access", route: "/access", persona: "person_a", target: "services", covers: ["access-navigation"], title: L("Finding services, without naming any", "الوصول إلى الخدمات دون ذكر أسماء"),
    text: L("Generic service types only, in equal weight. A hand-off records a request but names no clinic and never claims availability.",
            "أنواع خدمات عامة فقط وبوزن متساوٍ. يسجل التحويل طلبا لكنه لا يذكر عيادة ولا يعد بالتوفر."),
    run: async (c) => { await click('[data-demo="handoff"]'); c.log("handoff:recorded"); } },
  { id: "summary", route: "/summary", persona: "person_a", target: "summary", covers: ["take-home-summary"], title: L("A one-page take-home summary", "ملخص من صفحة واحدة"),
    text: L("What was found, what it means, questions worth asking and the options, on one printable page for the counsellor visit.",
            "ما وُجد ومعناه وأسئلة تستحق الطرح والخيارات، في صفحة واحدة قابلة للطباعة لموعد المستشار.") },
  { id: "family", route: "/family", persona: "person_a", target: "pedigree", covers: ["family-tree", "invitations"], title: L("The family circle", "دائرة العائلة"),
    text: L("A pedigree in standard symbols; the double line marks a related couple. A relative appears only as a relationship until they accept an invitation, and declining reveals nothing.",
            "نسب بالرموز المعيارية؛ الخط المزدوج يدل على زوجين أقارب. يظهر القريب كعلاقة فقط حتى يقبل الدعوة، ولا يكشف الرفض شيئا."),
    run: async (c) => { await click('[data-demo="invite"]'); c.log("invite:sent"); } },
  { id: "toolkit", route: "/family", persona: "person_a", target: "toolkit", covers: ["family-toolkit"], title: L("Starting the family conversation", "بدء الحديث مع العائلة"),
    text: L("Studies show relatives are often never told. Gentle conversation starters and a shareable card help, and the card never contains a result or a name.",
            "تُظهر الدراسات أن الأقارب كثيرا ما لا يُخبرون. تساعد عبارات لطيفة وبطاقة قابلة للمشاركة، ولا تحوي البطاقة نتيجة أو اسما.") },
  { id: "consents", route: "/consents", persona: "person_a", target: "consents", covers: ["consent-centre", "revoke"], title: L("Consent centre: stop sharing in one tap", "مركز الموافقات: أوقف المشاركة بنقرة"),
    text: L("Every agreement is listed with who, why and until when. Watch: revoking the couple agreement takes effect on the very next request.",
            "كل موافقة مدرجة مع من ولماذا وإلى متى. شاهدوا: إلغاء موافقة الزوجين يسري عند الطلب التالي مباشرة."),
    run: async (c) => { await click('[data-demo="revoke-first"]'); c.log("consent:revoked"); } },
  { id: "revoked", route: "/couple", persona: "person_a", target: "steps", covers: ["immediate-revocation"], title: L("Revocation is immediate", "الإلغاء فوري"),
    text: L("The couple view is closed again: the figure is gone and the page asks for agreement afresh. Nothing cached remains visible.",
            "عرض الزوجين مغلق مجددا: اختفى الرقم وتطلب الصفحة الموافقة من جديد. لا يبقى شيء مخزن ظاهرا.") },
  { id: "privacy", route: "/privacy", persona: "person_a", target: "matrix", covers: ["privacy-centre"], title: L("Privacy centre: who can see what", "مركز الخصوصية: من يرى ماذا"),
    text: L("A matrix of roles against information. The default is no, there is no export, and nothing is used for employment, insurance or commercial purposes.",
            "مصفوفة للأدوار مقابل المعلومات. الأصل هو المنع، ولا يوجد تصدير، ولا يُستخدم شيء للتوظيف أو التأمين أو التجارة.") },
  { id: "accesslog", route: "/privacy", persona: "person_a", target: "accesslog", covers: ["access-trail", "delete-data"], title: L("Who looked at your information", "من اطلع على معلوماتك"),
    text: L("Every access and every refusal is recorded without the content. You can also delete your data entirely.",
            "يُسجَّل كل اطلاع وكل رفض دون المحتوى. ويمكنك أيضا حذف بياناتك بالكامل.") },
  { id: "kin-open", route: "/result", persona: "person_a", target: "kin-panel", covers: ["assistant", "chat"], title: L("Kin, the assistant", "كِن، المساعد"),
    text: L("Kin answers questions about your own result by typing or by voice. Watch a question being asked.",
            "يجيب كِن عن أسئلة حول نتيجتك أنت كتابة أو صوتا. شاهدوا طرح سؤال."),
    run: async (c) => { window.dispatchEvent(new Event("kin:open")); await waitFor('[data-demo="kin-input"]'); await sleep(600); await ask(c, "What is a carrier?"); } },
  { id: "kin-refuse", route: "/result", persona: "person_a", target: "kin-panel", covers: ["assistant-guard"], title: L("Kin declines what it must", "كِن يرفض ما يجب رفضه"),
    text: L("Questions about other people, decisions or medical advice are politely declined, and attempts to change its rules fail. It never tells a couple what to decide.",
            "تُرفض بأدب الأسئلة عن الآخرين أو القرارات أو النصيحة الطبية، وتفشل محاولات تغيير قواعده. لا يخبر الزوجين أبدا بما يقررانه."),
    run: async (c) => { window.dispatchEvent(new Event("kin:open")); await waitFor('[data-demo="kin-input"]'); await ask(c, "What is my partner's raw result?"); await sleep(2200); await ask(c, "Should we get married?"); } },
  { id: "kin-arabic", route: "/result", persona: "person_a", target: "kin-panel", covers: ["assistant-multilingual", "voice"], title: L("Multilingual, with voice", "متعدد اللغات مع الصوت"),
    text: L("Ask in Arabic and Kin answers in Arabic, right to left. The microphone uses the browser's own speech recognition and replies can be read aloud; if a device lacks a voice, Kin says so and shows text.",
            "اسأل بالعربية فيجيب كِن بالعربية من اليمين إلى اليسار. يستخدم الميكروفون التعرف الصوتي في المتصفح ويمكن قراءة الردود بصوت عال؛ وإن لم يتوفر صوت يقول كِن ذلك ويعرض النص."),
    run: async (c) => { window.dispatchEvent(new Event("kin:open")); await waitFor('[data-demo="kin-input"]'); await ask(c, "ما هو الحامل؟"); c.log("kin:arabic"); } },
  { id: "settings", route: "/result", persona: "person_a", target: "settings-panel", covers: ["dark-mode", "accessibility"], title: L("Comfort and accessibility", "الراحة وإمكانية الوصول"),
    text: L("Dark mode, three text sizes, high contrast and reduced motion are one click away. The whole product keeps working by keyboard.",
            "الوضع الداكن وثلاثة أحجام للخط والتباين العالي وتقليل الحركة على بعد نقرة. ويبقى المنتج كله قابلا للاستخدام بلوحة المفاتيح."),
    run: async (c) => {
      await click('[data-demo="settings"]'); await waitFor('[data-demo="settings-panel"]');
      c.setTheme("dark"); c.setText(1); c.log("theme:dark");
    } },
  { id: "arabic", route: "/couple", persona: "person_a", target: "nav", covers: ["rtl"], title: L("Arabic, laid out right to left", "العربية بتخطيط من اليمين إلى اليسار"),
    text: L("Switching to Arabic mirrors the whole layout: the menu moves to the right and icons that imply direction flip. The family diagram keeps its drawing direction.",
            "التبديل إلى العربية يعكس التخطيط كله: تنتقل القائمة إلى اليمين وتنعكس الأيقونات الدالة على الاتجاه. ويحتفظ مخطط العائلة باتجاه رسمه."),
    run: async (c) => { c.setLang(c.lang === "ar" ? "en" : "ar"); await sleep(2200); c.setLang(c.lang); c.setTheme("light"); c.setText(0); c.log("lang:roundtrip"); } },
  { id: "analyst", route: "/analyst", persona: "analyst", target: "tiers", covers: ["analyst-dashboard", "suppression"], title: L("The analyst sees only anonymous totals", "المحلل يرى مجاميع مجهولة فقط"),
    text: L("Counts below ten are hidden, noise is added from a privacy budget, and nothing at person level is ever shown. Couples are grouped by support level.",
            "تُخفى الأعداد دون عشرة وتُضاف ضوضاء من ميزانية خصوصية ولا يُعرض شيء على مستوى الأشخاص. يُجمع الأزواج حسب مستوى الدعم.") },
  { id: "burden", route: "/analyst", persona: "analyst", target: "burden", covers: ["carrier-burden"], title: L("Carriers by condition", "الحاملون حسب الحالة"),
    text: L("Thirty fictional conditions drawn from the demo cohort. The eye icon marks a hidden small group.",
            "ثلاثون حالة خيالية من المجموعة التجريبية. تشير أيقونة العين إلى مجموعة صغيرة مخفية.") },
  { id: "weekly", route: "/analyst", persona: "analyst", target: "weekly", covers: ["time-to-care"], title: L("Time to care", "الزمن حتى الرعاية"),
    text: L("Median waiting days from result to counsellor contact, by week. This is an illustrative simulation with stated assumptions, not a forecast.",
            "وسيط أيام الانتظار من النتيجة إلى تواصل المستشار حسب الأسبوع. هذه محاكاة توضيحية بافتراضات معلنة وليست تنبؤا.") },
  { id: "equity", route: "/analyst", persona: "analyst", target: "heatmap", covers: ["equity"], title: L("Equity across languages and literacy", "الإنصاف بين اللغات ومستويات القراءة"),
    text: L("Quiz pass rates by language, reading level and age band, with a ten-point gap target. These are scripted test inputs that exercise the pipeline, not evidence about people.",
            "نسب نجاح الاختبار حسب اللغة ومستوى القراءة والفئة العمرية مع هدف فجوة عشر نقاط. هذه مدخلات اختبار مبرمجة تجرّب المسار وليست دليلا عن الناس.") },
  { id: "capacity", route: "/analyst", persona: "analyst", target: "capacity", covers: ["capacity-simulator"], title: L("Capacity simulator", "محاكي السعة"),
    text: L("Slide the number of counsellor slots to see waiting times under three policies. Prioritising by tier, and handling tier one automatically, shortens waits for those who need a counsellor most.",
            "حرّك عدد مواعيد المستشارين لترى أزمنة الانتظار بثلاث سياسات. تقدم الأولوية حسب المستوى والمعالجة الآلية للمستوى الأول وقتا أقصر لمن يحتاج المستشار أكثر."),
    run: async (c) => {
      const el = await waitFor('[data-demo="slots"]') as HTMLInputElement | null;
      if (el) for (const v of ["10", "14", "20"]) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); await sleep(700); }
      c.log("capacity:slid");
    } },
  { id: "governance", route: "/governance", persona: "auditor", target: "verify", covers: ["audit-chain", "governance"], title: L("An audit trail that detects tampering", "سجل تدقيق يكشف العبث"),
    text: L("Every decision is chained with a hash. Verify the chain, then run the tamper test and watch it fail, proving that altering history is detectable.",
            "كل قرار مرتبط ببصمة. تحقق من السلسلة ثم شغّل اختبار العبث وشاهده يفشل، إثباتا بأن تغيير التاريخ يمكن كشفه."),
    run: async (c) => {
      await click('[data-demo="verify"]'); await sleep(1500); await click('[data-demo="tamper"]');
      if (await waitFor('[data-testid="chain"][data-valid="false"]', 3000)) c.log("audit:tamper-detected");
    } },
  { id: "methods", route: "/methods", persona: "auditor", target: "formulas", covers: ["methods", "transparency"], title: L("Methods and evidence", "المنهجية والأدلة"),
    text: L("Every formula is shown, with the kinship values the engine must pass and the review status. The textbook formulas are unreviewed clinically, and the page says so.",
            "تُعرض كل معادلة مع قيم القرابة التي يجب أن يجتازها المحرك وحالة المراجعة. المعادلات الكتبية لم تُراجع سريريا، وتذكر الصفحة ذلك.") },
  { id: "outro", route: "/home", target: "hero", covers: ["wrap-up"], title: L("That is KinSight", "هذا هو كِنسايت"),
    text: L("Deterministic numbers, approved wording, consent on every read, a human in the loop, and a path from result to care. All fictional, all running offline.",
            "أرقام حتمية وصياغة معتمدة وموافقة عند كل اطلاع وإنسان في الحلقة ومسار من النتيجة إلى الرعاية. كله خيالي ويعمل دون اتصال.") },
];

/** Every feature key the demo shows, in order, for the final checklist and the coverage test. */
export const COVERAGE = [...new Set(STEPS.flatMap((s) => s.covers))];
export const ROUTES = [...new Set(STEPS.map((s) => s.route).filter(Boolean))] as string[];
