# Family planning guide

The guide lives at `/learn/family-planning` and is linked from the public homepage, Learn and Care Plan. It explains pregnancy preparation, spacing and contraception, test scope and inheritance, fertility assessment, and questions about privacy and personal values. Each topic ends with a question the visitor can take to a clinician.

## Evidence and design

| Topic | Source and design decision |
| --- | --- |
| Pregnancy preparation | Turn health history, medicines, vaccinations and family history into consultation prompts. Keep medication changes and dosing with the clinician. [CDC pregnancy preparation](https://www.cdc.gov/pregnancy/about/) |
| Spacing and methods | Describe differences in purpose, use, reversibility and side effects. A clinician can match available options to a person’s needs. [WHO contraception overview](https://www.who.int/news-room/fact-sheets/detail/family-planning-contraception) |
| Inherited conditions | Explain that someone can be a carrier without symptoms and that interpretation depends on the condition and test. Prompt a discussion of family history outside the panel. [CDC inherited conditions](https://www.cdc.gov/genomics-and-health/about/genetic-disorders.html) · [ADPHC screening programme](https://www.adphc.gov.ae/en/Public-Health-Programs/Premarital-Screening) |
| Local pathways | Default to general education. An explicit choice exposes Abu Dhabi or Saudi links. UAE law and its amendment inform the scope, with current requirements confirmed by a local provider. The Saudi links cover its own screening and preconception services. [Abu Dhabi services](https://www.doh.gov.ae/en/programs-initiatives/ART%20Program) · [UAE law](https://uaelegislation.gov.ae/en/legislations/1438/download) · [2023 amendment](https://uaelegislation.gov.ae/ar/constitution/modifications/1490/download) · [Saudi screening](https://www.moh.gov.sa/en/eservices/pages/premarital-screening.aspx) |
| Culture and privacy | Offer a private visit, an interpreter, and questions about family involvement and personal or faith considerations. Choice of language and location do not set a person’s beliefs. [UAE genetics counselling interviews](https://doi.org/10.1002/jgc4.70139) |

The selector is held in the page and resets on reload. The guide collects no personal data and has no API or model calls of its own. The existing prep sheet is a separate feature. The Care Plan calculator now displays the date estimate and refers testing schedules and local requirements to a clinician. The API response remains compatible with existing callers.

## Pilot checks

Have native Arabic and practising genetics reviewers approve the questions and review the local service links before patient use. In a formative study, ask people to distinguish the source of their next step from general education, find the correct contact for their location, and explain who can see their choices. Measure that alongside teach-back on the existing screening journey. Add another jurisdiction only after checking provider pathways, referral contacts and local requirements with that jurisdiction’s reviewer.
