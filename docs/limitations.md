# Limitations and assumptions

- All data is synthetic. No real genomes, no real people, no clinical validation.
- Panel frequencies, sensitivities and the consanguinity shares are illustrative (the 1990s UAE-study defaults are dated; change them freely in `configs/`).
- Genetics formulas are standard results, not reviewed by a genetics professional in this project. The review gate in `docs/REVIEWS.md` is open.
- Arabic text and templates are placeholders pending a native-speaker review; none is marked approved.
- The comprehension numbers shown by the pipeline come from scripted test inputs and are not evidence about people. Real evidence would come only from the small volunteer study (`docs/study/protocol.md`), which has not been run and needs the college's ethics check first.
- The capacity simulator is a labelled illustrative model with stated assumptions, not a forecast.
- Differential-privacy noise uses a budget ledger but suppression is deterministic, so this is not a claim of end-to-end formal privacy.
- Audit chain detects modification, deletion and forks; detecting tail truncation needs an externally stored head hash (supported, not provisioned).
- Demo authentication uses fictional personas and signed short-lived tokens; production would need real identity and in-region hosting.
- Optional items (voice, private partner check, FHIR export, extra languages) are not built unless listed as done in `docs/PLAN.md`.
- Dependencies: Python 3.10+, LangGraph 1.x, FastAPI, SQLAlchemy 2, Next.js 14 (see lock files).
