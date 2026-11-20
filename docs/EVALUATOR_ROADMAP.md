# Evaluator roadmap

KinSight should help a person understand a provider-released screening result in private, prepare questions, and reach the appropriate team. Abu Dhabi already has a premarital screening service. An early pilot would work within that service with one clinical owner, one lab and one approved panel. The family-planning guide is the educational path into that same visit. [Challenge brief](https://hack2skill.com/event/futurehealthchallenge/#focus-areas) · [Abu Dhabi programme](https://www.adphc.gov.ae/en/Public-Health-Programs/Premarital-Screening) · [Dubai implementation study](https://www.nature.com/articles/s41591-026-04251-7)

## Delivery sequence

| Order | Work and owner | Evidence or acceptance |
| --- | --- | --- |
| 1 · Demonstration | Engineering and submission lead. Guide in English and Arabic, explicit region choice, safe fictional report examples, exact structured report evidence, consistent limitations in the deck, form and live walkthrough. | Desktop and phone tests, dated hosted smoke, isolated demo walkthrough. Record the web and API release identifiers used by the demo. |
| 2 · Clinical content and Arabic | Practising genetics professional and native Arabic reviewer. Review risk, uncertainty, panel limits, guide text, terminology and consultation questions across the core journey. | Record reviewers, scope, date and approved content revision in [REVIEWS.md](REVIEWS.md). Check dynamic RTL, keyboard and screen-reader use. |
| 3 · Report input validation | Intake engineering and clinical QA. Test approved examples for one partner layout, plus bilingual photos, negatives, uncertain and incomplete findings, amendments and duplicates. | Report wrong accepted fields, misses, unreadable files, supported layout coverage and review time. A proposed field has a verifiable source or an explicit manual check. |
| 4 · Understanding and access | Study lead and clinical operations. Review the protocol with ethics, run fictional-case formative sessions, then compare the reviewed explanations with the usual material. | Predefine measures, report denominators and uncertainty, protect small groups. Record completed counselling and time to first appropriate contact when the provider can verify those outcomes. |
| 5 · One supervised clinical deployment | Provider, lab and privacy lead. Agree identity and report mappings, closed-loop handoff, data-processing approvals, retention and response ownership. | Test wrong-person and revoked access, corrections, duplicates, missing source, rollback and restore. Partner signs off on readiness before any live records. |
| 6 · Expansion | Product and clinical leads. Extend report support and jurisdictions from measured need. Test the optional model only against the deterministic baseline. | Demonstrate separate improvements in understanding or workload without a decline in safety. Confirm each jurisdiction’s links and pathway with a local reviewer. |

## Evidence to show judges

Use two fictional sessions and a reviewer. Show separate consent, a sourced result held until review, and the released explanation. Ask a question that checks understanding, then show one local follow-up. Show an amendment held for fresh review or a denied view as the safety example. Keep public report comparison separate from the clinical intake demonstration.

On 20 November 2026, browser checks found the hosted FHIR preview and lab sandbox controls visible. The healthy Render API and Vercel rewrite rejected unauthenticated requests to import or lab submission routes. Earlier authorized synthetic checks covered cross-person isolation, release after review, signed HL7 progress, and unsigned and replay rejection. Record a fresh smoke before presenting a deployment. These checks do not establish clinical validity or a live provider connection. [HAPI rollout](https://github.com/loktrishal-05/kinsight/pull/119) · [Lab rollout](https://github.com/loktrishal-05/kinsight/pull/108)

## Pilot entry criteria

- Agree a clinical owner, partner-approved data flows and a stop rule for a wrong-person release, an unverified complex result or a confirmed privacy incident.
- Confirm Abu Dhabi exchange requirements and the provider's approved integration method. If SMART is supported, agree trusted issuer, client registration, redirect, scopes and patient context. Verify PKCE and refusal of mismatched subjects in its synthetic sandbox. [Abu Dhabi exchange standards](https://www.doh.gov.ae/en/resources/HIE) · [SMART App Launch](https://hl7.org/fhir/smart-app-launch/)
- Keep the public demo synthetic. Obtain clinical, ethics and data approvals covering the provider environment, hosting, back-ups, support, telemetry and incident handling. [UAE health ICT law](https://uaelegislation.gov.ae/en/legislations/1209/download)
- Before recruitment, agree the comparator and what counts as correct teach-back on carrier vs condition, per-pregnancy estimates, missing vs reported negative findings, next steps and privacy. Analyse language and access gaps only when the sample and privacy protections support it. [Study protocol](study/protocol.md) · [Metrics](METRICS.md)
