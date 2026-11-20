# Accessibility

KinSight targets **WCAG 2.2 level AA**. This page says what is checked automatically, what was fixed, and what still needs a person to check.

## Checked in CI on every pull request

| Check | What it covers | Where |
| --- | --- | --- |
| axe-core (WCAG 2.0, 2.1, 2.2, A and AA) | 27 pages, each in English, Arabic (right-to-left) and Hindi, on a desktop and a phone viewport. Zero violations allowed. | `web/e2e/a11y.spec.ts` |
| Keyboard-only journey | Skip link, then the preparation sheet's sharing step reached and operated with Tab, Enter and Space only | `web/e2e/keyboard.spec.ts` |
| Biome accessibility rules | Labels tied to controls, ARIA roles with their required state, no interactive roles on static elements | `web/biome.json`, `npm run lint` |
| Risk labels | Every percentage or "1 in N" sits next to its educational-estimate label, in all seven languages | `web/e2e/estimate-label.spec.ts` |

## What the app does

- **Skip link** to the main content on every app page, and **focus moves to the new page** after each navigation.
- **Landmarks:** banner, navigation, main and footer on every app page.
- **Live regions:** Kin's replies, the lab tracker and status messages are announced (`aria-live="polite"` and `role="status"`).
- **Right-to-left:** Arabic switches the document direction; numbers stay left-to-right where they would otherwise read backwards.
- **Charts and figures:** the 100-person icon array has a text caption ("25 out of 100 pregnancies"); the scenario explorer has a table alternative; the analyst heatmap shows the numbers in its cells.
- **Scrolling tables** (privacy matrix, report comparison, analyst heatmap, receipt) can be focused and scrolled with the keyboard.
- **Contrast:** heatmap cells keep dark text on a tint capped at 45%, about 8:1 at worst.
- **Reduced motion:** the landing animation respects `prefers-reduced-motion` (`web/e2e/landing.spec.ts`).
- **Comfort settings:** larger text and reading level.

## Fixed in this pass

- Label-in-name mismatch on the search button (WCAG 2.5.3).
- Brand link with no accessible name on small screens (2.4.4).
- Scrollable regions that keyboard users could not reach (2.1.1).
- Heatmap text contrast (1.4.3).
- Case picker list markup, persona selects without associated labels, a switch without its state, a decorative SVG exposed to screen readers, and command-palette options that wrapped buttons.

## Still needs people

- A screen-reader pass (NVDA, VoiceOver on iOS, TalkBack) in English and Arabic. Automated tools find roughly a third to a half of real issues.
- A Lighthouse run on the deployed site, recorded here with its date.
- Review by disabled users as part of the comprehension study (issue #44).

`useButtonType` is still a warning, not an error: an automatic fix would turn form submit buttons into plain buttons, so each of the 104 sites needs a look.
