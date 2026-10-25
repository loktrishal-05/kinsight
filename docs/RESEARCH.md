# Research, evaluator questions and the plan built from them

All people and results in KinSight are fictional. The research below shapes features; it is not clinical validation.

## 1. What goes wrong in real premarital and carrier-screening programmes

Evidence found (web search, 2026-10-25; secondary sources, read as indications, not proof):

| Real problem | Evidence | What KinSight does about it |
|---|---|---|
| **Too few genetic counsellors**; other physicians counsel instead | Middle East reviews and a provider survey describe a counsellor and geneticist shortage; Abu Dhabi trained 244 physicians to give standard pre- and post-test counselling ([Springer 2025](https://link.springer.com/article/10.1007/s12687-025-00819-x), [Khaleej Times](https://www.khaleejtimes.com/uae/doctors-warning-marrying-relatives-health-risks-genetic-diseases), [Genes 2022](https://www.mdpi.com/2073-4425/13/2/167/html)) | Tier-based triage, counsellor queue with filters, a one-page case brief, a capacity simulator with adjustable counsellor slots, and a physician-friendly scripted brief |
| **Knowledge and trust gaps; many couples proceed despite high-risk results**; cultural resistance to changing marriage plans | UAE clinic survey (255 couples): good knowledge 77%, good practice 58%; Saudi reviews report limited knowledge, low trust and resistance ([PMC 2026](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12880793/), [Qatar](https://qatar-tribune.com/article/156636/nation/premarital-screening-a-proactive-approach-rooted-in-precision-medicine)) | Learn hub (plain explanations, myths vs facts), teach-back quiz with gentle re-explanation, options explorer with equal weight, non-directive wording enforced by tests |
| **Family communication breaks down**: guilt, distress, complexity; extended relatives are often never told | Cascade-testing studies: carriers tell close family but not extended relatives; satisfaction predicts sharing; toolkits are being trialled ([Genomes2People](https://www.genomes2people.org/wp-content/uploads/2024/04/20240516_Adelson_Journal-Genetic-Counseling_Familial-Communcation-and-Cascade-Testing.pdf), [MedStar](https://www.medstarhealth.org/blog/cascade-genetic-testing-research)) | Family circle with scoped invitations, a conversation toolkit and a shareable card that contains **no result**, consent matrix |
| **Anxiety depends on how a result is delivered**, and people need support afterwards | Newborn carrier-screening study: distress tracked delivery style, not the carrier result itself ([Nottingham](https://nottingham-repository.worktribe.com/output/1098311/parents-responses-to-receiving-sickle-cell-or-cystic-fibrosis-carrier-results-for-their-child-following-newborn-screening)) | Neutral colours and words (found / not found), "take a moment" pacing, support options, take-home summary |
| **Low uptake and drop-off after the result** | Programme reports show low voluntary uptake and no tracked follow-up (Oman voluntary ~10%; [IJCMPH](https://www.ijcmph.com/index.php/ijcmph/article/download/14826/8719/72231)) | Referral state machine with owners, due dates, overdue flags; a journey tracker that always shows the next step |
| **Numbers are hard**: percentages and risk are misread | Risk-communication literature favours natural frequencies and icon arrays | Icon array ("out of 100 pregnancies"), Punnett square, plain-language "estimate, not a diagnosis" |
| **Language and literacy**; counselling in a second language | Provider surveys name language barriers and limited resources | Arabic and English, two reading levels, read-aloud, glossary, larger text and contrast settings |
| **Privacy fears** (family honour, insurance, employment) | Stigma and low trust reports above | Privacy centre: who can see what, access trail, one-tap revoke, delete my data, no unrelated-use purposes |

Gaps in the evidence: no public data on counselling wait times or on comprehension after counselling were found, so the simulator and the study protocol stay clearly labelled illustrative or unrun.

## 2. Questions an evaluator or professional will ask

| Question | Where answered |
|---|---|
| Is the risk maths correct and can I check it? | `/methods` shows formulas, assumptions, the required test values (1/16, 1/8, ...) and review status; golden files; `docs/model_card.md` |
| Can a model invent a number or give advice? | No: model-free Mode A, verifier, red-team set, copilot guard (`/methods`, `/governance`) |
| Who is accountable for a tier 3 result? | Counsellor gate, audit trail, closure needs evidence |
| What happens if the partner declines? | Neutral message, nothing revealed (Family circle, Privacy centre) |
| How is consent enforced and revoked? | `/privacy` matrix, revoke, immediate effect (tests) |
| Can the data identify people? | No names or IDs; deny-list tests; aliases only |
| Is it equitable across languages and literacy? | Comprehension heatmap and 10-point gap target |
| What is the impact on time to care? | Capacity simulator with sliders (illustrative) |
| Can it scale or be deployed in-region? | Containers, config-driven panel and languages, `docs/pilot_plan.md` |
| What does a counsellor see? | Filterable queue, one-page brief, timeline |
| What would a patient take home? | Print-ready summary page |
| What are the limits? | `docs/limitations.md`, generated limitations statement |
| What if the screen is hard to read or the user cannot read? | Text size, contrast, dark mode, read aloud, reading levels |
| What about a relative who must be told? | Family toolkit and a no-result invitation card |

## 3. Features added in this round (built and tested unless noted)

1. Rich fictional data generated from the real engine and verified templates: six couple scenarios (every tier, X-linked, uncertain, unrelated and related), 30 conditions with Arabic and English labels, a 24-case counsellor queue, weekly time series, comprehension matrix and capacity grid, all exported by `scripts/export_web_fixtures.py` from the committed demo cohort.
2. Cinematic landing hero and scenario picker.
3. Light and dark themes with a considered palette; accessibility settings (text size, high contrast, reduced motion).
4. Icon-array and Punnett-square risk visuals; journey tracker; take-home summary.
5. Learn hub (basics, myths vs facts, searchable glossary), Family toolkit, Privacy centre, Methods page.
6. Counsellor queue with search and filters; analyst charts (carrier burden, weekly trends, comprehension heatmap, capacity sliders).
7. Command palette (Ctrl or Cmd + K).

Not built (needs people or infrastructure): reviewer sign-off, the volunteer study, real appointment booking, SMS/email reminders, real identity, in-region hosting, clinical validation.

## 4. Voice and chat assistant (Kin) and service access

- **Kin** floats on every page and has a full-page version at `/ask`. It is typed or spoken, in English or Arabic, and answers in the
  language the person used (Arabic script wins; otherwise the interface language). It is deterministic and read-only: no model, no
  server-side storage, no audio stored. It reads out only the person's own verified explanation, the glossary, the consent summary and
  page links, and declines questions about other people, decisions, clinical advice, bulk data and attempts to change its rules.
- **Voice** uses the browser's own speech recognition and speech synthesis (`ar-AE` / `en-US`). Missing support, a blocked microphone,
  silence, or no installed voice for a language all degrade to text with a clear message.
- **Checks:** `web/tests/assistant.test.ts` runs the same 109-prompt red-team set as the Python guard (parity), plus language and
  consent behaviour; `web/e2e/assistant.spec.ts` drives chat and voice with stubbed speech APIs on desktop and phone (24 runs).
  Real microphones and voices differ by browser and operating system, so a person should try it once on each target browser.
- **Logo:** generated with Canva (an AI image), made transparent and used as the launcher, header and favicon (`web/public/kin-logo.png`).
- **Finding services** (`/access`): generic service types in equal weight, with a hand-off stub that only records a request in the browser
  session. It names no facility and claims no availability (challenge requirement 2).
