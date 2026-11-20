# Review pack for clinical and language reviewers

Thank you for reviewing KinSight. Everything in the app is **fictional**: no real people, results or genomes. A review takes about 30 minutes. Record what you checked in the table at the end of this page (or send notes and we record them). Nothing is marked "reviewed" unless you actually reviewed it.

Live demo: https://kinsight-five.vercel.app. Choose **Start the demo**, then switch roles with **Viewing as** at the top.

## A. Clinical review (genetic counsellor or clinical geneticist), about 30 minutes

| # | What to look at | Where | Questions for you |
| --- | --- | --- | --- |
| 1 | Formulas and their limits | `/methods` | Are the formulas right for autosomal recessive and X-linked inheritance? Is anything stated more confidently than it should be? |
| 2 | A person's result and its explanation | `/result` as Person A | Is the plain-language explanation accurate? Is "carrier" explained without alarm? |
| 3 | Couple figure with its estimate label | `/couple` (after both share and the counsellor approves) | Is "educational estimate, not a diagnosis" enough? Anything a counsellor would add? |
| 4 | What-if scenarios | `/plan/scenarios` | Are the per-pregnancy and "at least one of N" figures and the untested-partner adjustment reasonable? Are the five routes described neutrally? |
| 5 | Relatives who may want testing | `/cascade` | Are the 1/2, 1/4, 1/8 carrier chances by degree correct? Is anything missing for X-linked conditions? |
| 6 | Counsellor tools | `/counsellor` as Counsellor | Does the brief and the review queue match how you would triage? What would you need that is not there? |
| 7 | Live reference data | `/clinic`, Reference data panel | Are MedlinePlus, ClinGen and VEP the right sources to show, and is the provenance clear? |
| 8 | Family planning education and referral | `/learn/family-planning`, both English and Arabic | Are contraception, preparation, inheritance, and fertility care described accurately and neutrally? Can someone distinguish local service information from personal eligibility? |
| 9 | Uncertainty and source limits | `/report-compare` and the synthetic integration walkthrough | Test a negative within panel, a missing result, an uncertain result and an amendment. Are they distinguishable? Does each have the right next action? |

The engine lives in `services/genetics/`; the draft wording lives in `templates/en/`. Tests cover the educational genetics calculations (`tests/unit/test_scenarios.py`, `tests/unit/test_cascade_engine.py`, `tests/golden/`).

## B. Language review (native speakers), about 30 minutes per language

Languages: Arabic, Hindi, Tamil, Telugu, Kannada, Malayalam. Arabic is the most complete; the others fall back to English for newer screens.

1. Switch the language in the top bar, then read `/home`, `/result`, `/couple`, `/prepare`, `/plan/scenarios`, `/cascade`, `/privacy`, and `/learn/family-planning`. In Arabic, use a phone and check keyboard or screen-reader navigation around the location selector and topic details.
2. For each screen, note: wrong or unnatural words, anything that sounds like advice or blame, anything that could upset a family, and right-to-left layout problems (Arabic).
3. The strings are in `web/messages/<code>.json`; the explanation templates in `templates/<code>/`; the preparation questions in `templates/<code>/prep_questions.yaml`; the route descriptions in `templates/<code>/scenario_options.yaml`.

Wording rules the review checks against: no "should", no recommendation about marriage or children, carrier status never called positive or negative (`configs/wording.yaml`).

## C. Record (copy each row into `docs/research/reviews.md`)

| Item and revision reviewed | Reviewer (name and role, only with permission) | Date | Finding and severity | Fix and recheck | Decision and scope |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

After a language review, change `label_ar_status: placeholder` (and the matching rows in `docs/research/reviews.md`) to `reviewed` only for the parts that were actually read.

## D. A message you can send

> Hello, I am part of a student team building KinSight, a fictional demo that helps couples understand inherited-condition screening results and prepares them for a genetic counsellor. Could you spare 30 minutes to review the formulas and wording? Everything is fictional; no real data is involved. The demo is at https://kinsight-five.vercel.app and a short guide is at https://github.com/loktrishal-05/kinsight/blob/main/docs/REVIEW_PACK.md. We will credit you only if you agree. Thank you.
