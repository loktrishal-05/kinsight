# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Couples and individuals in the Gulf region (Arabic and English speakers, mixed literacy) who received a premarital or preconception carrier-screening result, often from related families (consanguinity). Usually on a phone.
- Genetic counsellors who review high-impact results before release (desk).
- Analysts, auditors and a demo operator (desk).
- First audience for the landing page: Future Health Digital Innovation Challenge (Challenge 03) judges, watching a live demo within days.

## Product Purpose
A private, culturally sensitive navigator for inherited disease risk linked to consanguinity: explains carrier status, couple compatibility and per-pregnancy chance in plain, non-stigmatising language; routes complex findings to a human counsellor; keeps partner and family sharing under explicit consent; tracks the path from result to care.

## Positioning
Every number comes from a deterministic genetics engine and verified templates (no model invents figures); a counsellor gate holds high-impact results; consent is enforced on every read with a hash-chained audit. Education and decision support are kept apart from clinical advice.

## Operating Context
Premarital screening programmes in the Gulf; a shortage of genetic counsellors; family honour and privacy fears; extended relatives rarely told. Demo runs in mock mode with fictional people and a guided 42-step auto-demo.

## Capabilities and Constraints
- Next.js 14 app (`repo/web`), Tailwind, CSS-variable tokens, light/dark/high-contrast, Arabic RTL, two reading levels, read-aloud.
- Landing page (`app/page.tsx`) must keep: `data-demo` targets (hero, how, cases, personas), `data-testid="demo-start"`, the scenario picker and persona picker, and all i18n text in `messages/*.json`.
- Current redesign scope: landing page only; app screens keep their look. Hero 3D must be real-time in code (no generated video).

## Brand Commitments
- Name KinSight; assistant Kin with logo `public/kin-logo.png`.
- Neutral, non-directive, non-stigmatising voice: "found / not found", never "positive/negative"; never red/green for carrier status; "an estimate, not a diagnosis".

## Evidence on Hand
- Scorecard `docs/SCORECARD.md`: 1500 synthetic couples; 160 explanation drafts, numeric fidelity 100%, 0 banned phrases; red-team 109/109; capacity simulation (illustrative).
- Comprehension study NOT run: never claim comprehension results. No testimonials, customers, partners or deployments exist; do not fabricate them.

## Product Principles
1. Information, not a verdict: calm, neutral, never alarming.
2. A human decides: counsellors gate high-impact results.
3. The person owns the sharing: consent first, revocable at once.
4. Equal for every reader: Arabic and English, plain language, accessible.

## Accessibility & Inclusion
WCAG AA, full RTL parity, reduced motion respected, colour never the only signal, works on a phone.
