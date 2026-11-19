# Data sources
| Source | Licence | Real/Synthetic | Accessed | Use |
|---|---|---|---|---|
| Synthetic cohort (services/cohort, seed in configs/cohort.yaml) | Project (own) | Synthetic | generated | All people and results |
| configs/panel.yaml (fictional conditions, illustrative frequencies) | Project (own) | Synthetic | 2026-10-25 | Condition panel |
| Consanguinity shares in cohort.yaml | Dated figures cited in the spec (1990s UAE study) | Public statistic, illustrative | 2026-10-25 | Generator defaults only |
| [NCBI ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/docs/maintenance_use/) | NCBI site terms and submitter conditions | Public variant classifications | Live lookup verified 2026-11-18 | Variant explorer and reference reclassification checks |
| [gnomAD v4](https://gnomad.broadinstitute.org/news/2024-04-gnomad-v4-1) | Broad Institute data terms | Public aggregate allele counts | Live lookup verified 2026-11-18 | Population frequency lookup |
| [MedlinePlus Genetics](https://medlineplus.gov/about/using/usingcontent/) | NLM, public domain (cite the source) | Plain-language gene summaries | Live lookup verified 2026-11-19 | Counsellor reference panel on /clinic |
| [ClinGen gene-disease validity](https://clinicalgenome.org/docs/terms-of-use/) | ClinGen terms of use (CC0 data) | Expert-curated gene-disease validity | Live lookup verified 2026-11-19 | Counsellor reference panel on /clinic |
| [Ensembl VEP REST](https://www.ensembl.org/info/about/legal/disclaimer.html) | EMBL-EBI terms of use | Predicted variant consequence | Live lookup verified 2026-11-19 | Counsellor reference panel on /clinic |
| [HL7 FHIR R4 DiagnosticReport](https://hl7.org/fhir/R4/diagnosticreport.html) | [HL7 FHIR specification licence](https://hl7.org/fhir/R4/license.html) | Standard with published examples | 2026-11-18 | Format reference for locally written synthetic intake cases |
| [HL7 ORU to FHIR mapping](https://www.hl7.org/fhir/uv/v2mappings/ConceptMap-message-oru-r01-to-bundle.html) | HL7 published implementation guide | Standard mapping | 2026-11-19 | Field and resource reference for the synthetic lab message profile |
| [HAPI FHIR JPA Server Starter](https://github.com/hapifhir/hapi-fhir-jpaserver-starter) | Apache-2.0 | Local sandbox stores generated fixtures | 2026-11-19 | FHIR R4 transaction and revision checks |
| [HL7 Genomics Reporting STU3](https://hl7.org/fhir/uv/genomics-reporting/STU3/) | [HL7 FHIR specification licence](https://hl7.org/fhir/R4/license.html) | Reference profiles | 2026-11-19 | Variant and diagnostic implication structure |
| [LOINC variant assessment](https://loinc.org/69548-6) | [LOINC licence](https://loinc.org/license/) | Public terminology | 2026-11-19 | Variant assessment and answer codes in the fictional cohort export |
| [MedlinePlus Genetics topic index](https://medlineplus.gov/about/developers/geneticsdatafilesapi/) | [NLM linking and content terms](https://medlineplus.gov/about/using/usingcontent/) | Public gene and condition page links | 2026-11-18 | 1,515 gene and 1,315 condition links, bundled locally as URL slugs |
| [Labcorp sample reports](https://www.labcorp.com/womens-health/providers/resources/sample-reports) and [Myriad Foresight sample reports](https://myriad.com/genetic-tests/foresight-carrier-screen/) | Lab-published examples, linked | Public sample layouts | 2026-11-18 | Input format research for per-condition findings, variant details, copy numbers, repeat measurements, and coverage limitations |

KinSight sends public variant identifiers or gene symbols for reference lookups. Personal screening results require a report issued by the care provider and linked to the patient. KinSight’s demo stores fictional people and results. [NCBI ClinVar submission rules](https://www.ncbi.nlm.nih.gov/clinvar/docs/submission_instructions/) · [gnomAD population data](https://gnomad.broadinstitute.org/news/2023-11-genetic-ancestry)

The separate report comparison page processes user-selected PDFs and pasted findings in browser memory. The vendor sample documents are linked and excluded from the repository. The public reference index contains education links. It supplies no partner results, variant calls, or risk estimates.
