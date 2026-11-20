# Limitations and assumptions

- All data is synthetic. No real genomes, no real people, no clinical validation.
- Panel frequencies, sensitivities and the consanguinity shares are illustrative (the 1990s UAE-study defaults are dated; change them freely in `configs/`).
- Genetics formulas are standard results, not reviewed by a genetics professional in this project. The review gate in `docs/research/reviews.md` is open.
- Every non-English text (Arabic, Hindi, Tamil, Telugu, Kannada, Malayalam: interface, templates, quiz, Learn, Kin, study consent) is a machine draft marked placeholder pending native-speaker and genetics review; none is marked approved.
- The comprehension numbers shown by the pipeline come from scripted test inputs and are not evidence about people. Real evidence would come only from the small volunteer study (`docs/research/study/protocol.md`; tooling at `/study` is built and tested), which has not been run and needs the college's ethics check first.
- The capacity simulator is a labelled illustrative model with stated assumptions, not a forecast.
- Differential-privacy noise uses a budget ledger but suppression is deterministic, so this is not a claim of end-to-end formal privacy.
- Audit chain detects modification, deletion and forks; detecting tail truncation needs an externally stored head hash (supported, not provisioned).
- Demo authentication uses fictional personas and signed short-lived tokens; production would need real identity and in-region hosting.
- Optional items use `configs/flags.yaml`. Voice depends on browser speech support. The partner check is an unaudited demo. The FHIR referral export function has no route. Mode B requires a model and judge and is off.
- Dependencies include Python 3.10+, LangGraph 1.x, FastAPI, SQLAlchemy 2, and Next.js 16. The web build uses Node.js 22 in CI and Docker.
- The Python copilot red-team set has 109 English and Arabic prompts. The web assistant also exercises adversarial cases in Hindi, Tamil, Telugu, Kannada and Malayalam. These regression tests cover specific patterns. Native-speaker and independent safety review remain pending.
- Demo reset restores the case, quiz and referral state but keeps consent rows and the audit chain, so re-running the live demo flow on the same database fails on duplicate grants; use 'docker compose down -v' for a clean demo.
