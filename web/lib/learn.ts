// Plain-language learning content. Wording follows the approved-template rules (no directives, no blame, carrier is not a disease).
// Arabic is a placeholder pending native-speaker and genetics review (docs/REVIEWS.md).
type L = { en: string; ar: string };
const t = (en: string, ar: string): L => ({ en, ar });

export const GLOSSARY: { id: string; term: L; meaning: L }[] = [
  { id: "gene", term: t("Gene", "الجين"), meaning: t("A small part of our body's instruction book. We each have two copies of most genes, one from each parent.", "جزء صغير من كتاب تعليمات الجسم. لدى كل منا نسختان من معظم الجينات، واحدة من كل والد.") },
  { id: "carrier", term: t("Carrier", "حامل"), meaning: t("Someone who has a change in one copy of a gene but usually has no sign of the condition. Being a carrier is not the same as having the condition.", "شخص لديه تغير في إحدى نسختي جين لكنه عادة لا تظهر عليه علامات الحالة. أن تكون حاملا لا يعني أن لديك الحالة.") },
  { id: "recessive", term: t("Recessive inheritance", "الوراثة المتنحية"), meaning: t("A condition appears only when a child receives a changed copy from both parents. Each carrier parent passes it on about half the time.", "تظهر الحالة فقط عندما يتلقى الطفل نسخة متغيرة من كلا الوالدين. ينقلها كل والد حامل في نحو نصف الحالات.") },
  { id: "xlinked", term: t("X-linked", "مرتبط بالكروموسوم إكس"), meaning: t("A gene on the X chromosome. Sons and daughters can be affected differently because they carry different sex chromosomes.", "جين على الكروموسوم إكس. قد يتأثر الأبناء والبنات بشكل مختلف لاختلاف الكروموسومات الجنسية.") },
  { id: "related", term: t("Being related", "القرابة"), meaning: t("Relatives are more likely to share the same gene changes because they have common ancestors. This can raise the chance for some conditions.", "الأقارب أكثر احتمالا لمشاركة التغيرات الجينية نفسها لوجود أجداد مشتركين. قد يرفع ذلك الفرصة في بعض الحالات.") },
  { id: "estimate", term: t("Estimate", "تقدير"), meaning: t("A chance worked out from known facts. It is not a diagnosis and not a promise about any one child.", "فرصة محسوبة من حقائق معروفة. ليست تشخيصا ولا وعدا بشأن أي طفل بعينه.") },
  { id: "uncertain", term: t("Result not clear", "نتيجة غير واضحة"), meaning: t("Sometimes a test cannot give a clear answer. No chance is given until a counsellor helps work out the next step.", "أحيانا لا يعطي الفحص إجابة واضحة. لا تُعطى نسبة حتى يساعد مستشار في تحديد الخطوة التالية.") },
  { id: "confirmatory", term: t("Confirmatory test", "فحص تأكيدي"), meaning: t("A further test that can clarify a result. A counsellor can explain what it involves.", "فحص إضافي يمكنه توضيح النتيجة. يمكن للمستشار شرح ما يتضمنه.") },
  { id: "counsellor", term: t("Genetic counsellor", "مستشار وراثي"), meaning: t("A trained professional who explains results, answers questions and supports your choices without telling you what to do.", "مختص مدرّب يشرح النتائج ويجيب عن الأسئلة ويدعم خياراتك دون أن يخبرك بما تفعل.") },
  { id: "consent", term: t("Consent", "الموافقة"), meaning: t("Your choice about who may see what. You can stop sharing at any time.", "اختيارك لمن يحق له رؤية ماذا. يمكنك إيقاف المشاركة في أي وقت.") },
];

export const MYTHS: { myth: L; fact: L }[] = [
  { myth: t("A carrier is sick.", "الحامل مريض."), fact: t("Most carriers have no sign of the condition. Being a carrier is not the same as having it.", "معظم الحاملين لا تظهر عليهم علامات الحالة. أن تكون حاملا لا يعني أن لديك الحالة.") },
  { myth: t("A chance means it will happen.", "الفرصة تعني أن الأمر سيحدث."), fact: t("A chance is not a certainty. A one-in-four chance means most pregnancies are not affected.", "الفرصة ليست يقينا. فرصة واحد من أربعة تعني أن معظم حالات الحمل لا تتأثر.") },
  { myth: t("Someone is to blame for a gene change.", "هناك من يُلام على تغير جيني."), fact: t("Gene changes are common and nobody chooses them. Nobody is to blame.", "التغيرات الجينية شائعة ولا أحد يختارها. لا يُلام أحد.") },
  { myth: t("The result tells us what to decide.", "النتيجة تخبرنا بما نقرر."), fact: t("The result gives information. What to do next is always your choice, with support if you want it.", "تعطي النتيجة معلومات. الخطوة التالية خيارك دائما، مع الدعم إن رغبت.") },
  { myth: t("Everyone will find out.", "الجميع سيعرف."), fact: t("Nothing is shared unless you choose. You can stop sharing in one tap.", "لا يُشارك شيء ما لم تختر ذلك. يمكنك إيقاف المشاركة بنقرة واحدة.") },
  { myth: t("No findings means zero chance.", "عدم وجود نتائج يعني أن الفرصة صفر."), fact: t("No test finds everything, and being related can leave a very small chance. A counsellor can explain.", "لا يوجد فحص يكشف كل شيء، وقد تترك القرابة فرصة صغيرة جدا. يمكن للمستشار الشرح.") },
];

export const TALK_STARTERS: { id: string; text: L }[] = [
  { id: "t1", text: t("I had a health screening and I would like to tell you about it. Nothing is wrong with you or with me.", "أجريت فحصا صحيا وأود أن أخبرك عنه. لا ذنب لك ولا لي.") },
  { id: "t2", text: t("The screening looks at family health, not at blame. There is a counsellor who can explain it better than I can.", "يتناول الفحص صحة العائلة لا اللوم. هناك مستشار يشرحه أفضل مني.") },
  { id: "t3", text: t("You may want to talk to a counsellor yourself. It is private and it is your choice.", "قد ترغب في التحدث مع مستشار بنفسك. الأمر خاص وهو خيارك.") },
  { id: "t4", text: t("I would like us to decide together what to do next, at our own pace.", "أود أن نقرر معا ما نفعله لاحقا، وبالوتيرة التي تناسبنا.") },
];
