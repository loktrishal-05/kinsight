# Model card

**Intended use.** Education and decision support about carrier status and couple compatibility for fictional demo cases, with escalation to human genetic counsellors. Not clinical advice and not a diagnosis tool.

**Components.**
- Genetics engine v0.1.0: textbook formulas (kinship recursion, autosomal recessive and X-linked recessive couple risk with test sensitivity). *Not validated against a clinical source; a genetics-trained reviewer must check `tests/unit/test_assess.py` and `tests/golden/couples.json` before any use beyond the demo.*
- Explainer: no generative model in Mode A. A selector (deterministic by default) picks approved template blocks; the renderer fills numbers from the engine; the verifier checks allow-list, mandatory blocks, numeric fidelity, digits outside slots, banned phrases and readability.
- Mode B (constrained rewrite with an entailment judge): flagged off; only the fact-token check and the judge hook are implemented.

**Data.** Entirely synthetic (`DATA_SOURCES.md`). Frequencies and sensitivities are illustrative, not real prevalence.

**Known limits.** The both-not-detected figure assumes independence and says so; relatedness can raise the true figure. Arabic strings and templates are placeholders pending native review (`docs/REVIEWS.md`). Readability for Arabic uses a sentence-length proxy only.

**Evaluation.** `tests/evals`: 40 couples x 2 languages x 2 levels, gates at 100% numeric fidelity and block conformity, zero banned phrases. LLM-judge groundedness and human review run on a schedule when a model is configured.

**Safeguards.** Tier 3 counsellor gate, consent policy on every read, hash-chained audit log, no export route, no unrelated-use purpose codes.
