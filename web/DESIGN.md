---
name: KinSight
description: A private, calm navigator for inherited disease risk, in Arabic and English.
colors:
  canvas: "#F3F5F4"
  surface: "#FFFFFF"
  sunk: "#EBF0EE"
  ink: "#18272C"
  muted: "#55656B"
  line: "#DBE2E0"
  onbrand: "#FFFFFF"
  deep: "#0A4543"
  deepfg: "#E8F3F1"
  sand: "#FBF4E4"
  brand-50: "#E8F3F1"
  brand-100: "#CFE6E2"
  brand-200: "#A4CFC8"
  brand-500: "#1D7F7A"
  brand-600: "#106B68"
  brand-700: "#0C5755"
  brand-800: "#0A4543"
  found-bg: "#E9ECFA"
  found-fg: "#33417F"
  clear-bg: "#EEF1F0"
  clear-fg: "#40524F"
  unsure-bg: "#F7EED8"
  unsure-fg: "#6C5114"
  note-bg: "#FBF4E4"
  note-fg: "#5B4510"
  note-line: "#ECDCAE"
  lattice-sand: "#F4ECDC"
  light-dot: "#F1E9D8"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, Reem Kufi, Noto Sans Arabic Variable, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6.2vw, 5.4rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage Grotesque Variable, Reem Kufi, Noto Sans Arabic Variable, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 4.4vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Bricolage Grotesque Variable, Reem Kufi, Noto Sans Arabic Variable, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 3vw, 2.4rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  page-title:
    fontFamily: "Plus Jakarta Sans Variable, Noto Sans Arabic Variable, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  lede:
    fontFamily: "Plus Jakarta Sans Variable, Noto Sans Arabic Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Plus Jakarta Sans Variable, Noto Sans Arabic Variable, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.65
    fontFeature: "\"tnum\" 1"
  label:
    fontFamily: "Plus Jakarta Sans Variable, Noto Sans Arabic Variable, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.025em"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "56px"
  xl: "96px"
  2xl: "128px"
components:
  button-primary:
    backgroundColor: "{colors.brand-600}"
    textColor: "{colors.onbrand}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.brand-700}"
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  button-quiet-hover:
    backgroundColor: "{colors.brand-50}"
  button-pill:
    backgroundColor: "{colors.brand-600}"
    textColor: "{colors.onbrand}"
    rounded: "{rounded.full}"
    padding: "0 24px 0 20px"
    height: "48px"
  button-pill-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  chip-found:
    backgroundColor: "{colors.found-bg}"
    textColor: "{colors.found-fg}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  chip-clear:
    backgroundColor: "{colors.clear-bg}"
    textColor: "{colors.clear-fg}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  chip-unsure:
    backgroundColor: "{colors.unsure-bg}"
    textColor: "{colors.unsure-fg}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "40px"
  note:
    backgroundColor: "{colors.note-bg}"
    textColor: "{colors.note-fg}"
    rounded: "{rounded.xl}"
    padding: "14px"
  segment-active:
    backgroundColor: "{colors.brand-600}"
    textColor: "{colors.onbrand}"
    rounded: "{rounded.md}"
    height: "32px"
---

# Design System: KinSight

## Overview

**Creative North Star: "The Sunlit Screen"**

KinSight is a daylight world: a cool mint-grey canvas, white surfaces, night-teal ink, one deep teal accent, and warm sand as the light that comes through. Privacy is the architecture, and the mashrabiya (a lattice screen you can see out of without being seen) is its signature: eight-point stars of sand with teal light in the gaps. The app screens are quiet and dense with care information; the landing page is the one place the screen becomes a 3D object that opens as you scroll.

Tokens are CSS variables holding space-separated RGB triplets (`app/globals.css`), so light, dark and high-contrast share one set of class names; the frontmatter mirrors the light theme, the variables are normative. Every surface works in Arabic RTL with full parity, honours reduced motion, and never uses colour as the only signal. The tone is calm and neutral: information, not a verdict.

**Key Characteristics:**
- One teal accent for action; indigo reserved for "found"; sand as warmth, never alarm.
- Soft two-layer shadows tinted with the ink colour, never neutral black in light mode.
- Generous radii (8px controls, 16px cards, full pills on the landing).
- Expo-out motion that resolves to a complete still when motion is reduced.
- Mashrabiya star lattice as the reusable signature motif, in 3D and as a faint SVG pattern.

## Colors

A cool, low-chroma daylight palette with one deep teal accent and one warm sand ground.

### Primary
- **Mashrabiya Teal** (brand-600): primary buttons, active segment, focus outline, selected-row indicators, the scroll cue. Brand-700 is its hover and the beat-counter colour; brand-500 is the field focus border and the lit couple in the 3D tree.
- **Teal Wash** (brand-50 / brand-100 / brand-200): hover and selected-row fills, active nav item, text selection (brand-200 with brand-800 text).
- **Deep Teal** (deep, with deepfg text): the fictional-data banner across the top of every screen.

### Secondary
- **Found Indigo** (found-fg on found-bg): the "found" state and tier-2 chip. It exists so carrier status never needs red or green.

### Tertiary
- **Daylight Sand** (sand): the closing CTA band on the landing and the warm ground of notes. **Lattice Sand** (lattice-sand) is the 3D tile colour, a step deeper so the tiles read against a white-hot sky; **Light Dot** (light-dot) is the 75 unlit lights of the 10x10 chance.
- **Unsure Amber** (unsure-fg on unsure-bg): tier-3 / needs-a-counsellor chips. Note colours (note-bg, note-fg, note-line) carry gentle explanatory callouts.

### Neutral
- **Mint Canvas** (canvas): page ground and the hero veil.
- **Paper White** (surface): cards, fields, header.
- **Sunk Mint** (sunk): nav hover, recessed areas.
- **Night Teal Ink** (ink): all primary text; secondary text uses ink at 75% on the landing, muted elsewhere.
- **Slate Muted** (muted): descriptions, group labels, placeholders (at 70%).
- **Hairline** (line): every border and divider.

### Named Rules
**The One Teal Rule.** Teal is the only action colour. Every primary button, active toggle and focus ring is brand-600; nothing else competes for the eye.

**The Indigo Means Found Rule.** Indigo appears only for the "found" state. Carrier status is never red or green; tiers are indigo, neutral grey-green and amber.

**The Three Themes Rule.** A new colour is a CSS variable with a light, dark and high-contrast value, consumed as `rgb(var(--x) / alpha)`; no hex in components outside the landing hero's lighting.

## Typography

**Display Font:** Bricolage Grotesque Variable, with Reem Kufi for Arabic (fallback Noto Sans Arabic, system-ui)
**Body Font:** Plus Jakarta Sans Variable, with Noto Sans Arabic Variable (Arabic and Urdu documents switch to Noto first)

**Character:** A wide, warm grotesque with tight negative tracking for story headlines, over a clear humanist sans with tabular figures, because numbers here must line up and never feel like a sales pitch.

### Hierarchy
- **Display** (700, clamp(2.5rem, 6.2vw, 5.4rem), 0.98): the landing hero headline only.
- **Headline** (700, clamp(1.9rem, 4.4vw, 3.6rem), 1.08): the landing statement sentence and closing band (closing runs to clamp(2rem, 4.6vw, 3.8rem) at 1.02); scroll beats use clamp(1.8rem, 3.6vw, 3rem).
- **Title** (700, clamp(1.6rem, 3vw, 2.4rem), 1.08): landing section headings.
- **Page title** (700, 1.5rem rising to 1.75rem at sm, tight tracking): app screen headings, in the body face.
- **Lede** (400, 1.125rem, relaxed): hero and closing sub-copy at ink 75%, max 34rem; app leads are 0.95rem muted, max 68ch.
- **Body** (400, 0.9375rem, 1.65, tabular figures): everything else; reading width max 68ch.
- **Label** (600, 0.75rem, uppercase, 0.025em): group labels above lists and nav groups only.

### Named Rules
**The Display Is For Story Rule.** Bricolage and Reem Kufi set landing and persuasion headings only. App screens keep Plus Jakarta page titles.

**The Bare Headline Rule.** Headlines stand alone: no label, kicker or eyebrow above them. The uppercase label names a list or nav group, never a heading.

## Layout

App screens sit in a sticky 56px header plus a start-side nav; content is a single centred column. The landing runs at max-width 5xl (64rem) with 20px gutters on phones and 32px from sm. Section rhythm on the landing is 96px vertical (128px at sm) around the statement and closing band, 56px between content sections; card lists are stacked rows of 14px vertical padding separated by hairlines.

The hero is a 330vh scroll track with a sticky stage (full viewport minus the 5.5rem chrome, min 34rem). Copy sits start-aligned, max 44rem, over a canvas veil: a start-to-end gradient on desktop (90% to transparent by 44%), a solid top band on phones that shortens from 82% to 44% as the beats take over so the 3D stays full strength below. Everything mirrors in RTL, including the camera offset and the gradient direction. Larger reading sizes (112.5% and 125% root) scale the whole system.

## Elevation & Depth

A light, layered system: flat white surfaces on a mint ground, separated mainly by hairline borders, with soft two-layer shadows tinted with the ink colour (`--shadow`; pure black in dark mode). Hover lifts by 1-2px rather than deepening colour alone. On the landing, real depth comes from the WebGL scene: a sun from the upper right, a soft PCF shadow of the lattice thrown onto a wall as teal-deep shade at 22%.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px rgb(var(--shadow) / .06), 0 8px 24px -12px rgb(var(--shadow) / .14)`): cards at rest, secondary pill, primary button on hover.
- **Lift** (`box-shadow: 0 2px 4px rgb(var(--shadow) / .08), 0 18px 40px -16px rgb(var(--shadow) / .28)`): the landing's primary pill CTA.

### Named Rules
**The Ink-Tinted Shadow Rule.** Shadows are two layers, a tight contact and a long negative-spread blur, always tinted with the ink token. No hard offsets, no coloured glows.

## Shapes

Softly rounded throughout: 6px for segment buttons and the focus outline, 8px for buttons and fields, 12px for notes, 16px for cards, full pills for chips and the landing CTAs, circles for journey step markers (36px, 2px teal ring). The recurring geometry is the eight-point star (two overlapping squares) of the mashrabiya, tiled so tips nearly touch and leave cross and diamond openings.

## Components

### Buttons
Confident but quiet; a small lift on hover.
- **Shape:** gently curved (8px) in the app; full pill (48px tall) on the landing.
- **Primary:** brand-600 fill, onbrand text, 14px semibold, 40px tall, 16px sides; hover brand-700, rises 1px with the card shadow; active returns to rest; disabled at 50%.
- **Quiet:** white with hairline border, ink text; hover teal wash.
- **Landing pill primary:** brand-600, bold 14px, lift shadow, leading play icon that scales 110% on hover; hover rises 2px and deepens to brand-700.
- **Landing pill secondary:** white at 80% with an ink-15% border and card shadow; hover border turns brand-500.

### Chips
- **Style:** full pill, 12px semibold, 2px by 10px, tinted fill with its paired foreground.
- **State:** tier chips are found (indigo), clear (grey-green) and unsure (amber); never red or green.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** surface with a hairline border.
- **Shadow Strategy:** Card shadow at rest (see Elevation).
- **Internal Padding:** 20px; flush cards clip their rows and divide them with hairlines.

### Inputs / Fields
- **Style:** 40px tall, 8px radius, hairline border, white fill, placeholder muted at 70%.
- **Focus:** border turns brand-500 plus the global 2px brand-600 outline at 2px offset (3px in high contrast).

### Navigation
Start-side list in groups under uppercase labels; items are 14px medium, 8px radius, icon 18px muted. Active: teal wash with brand-800 text and teal icon. Hover: sunk. The segmented control (language, reading level) is a bordered 8px track with 32px buttons; the pressed one is brand-600.

### Mashrabiya Hero (signature)
A three.js scene loaded on demand: 28 x 26 instanced star tiles in lattice sand, closed and turned slightly in perspective, open outward from the centre as scroll progresses (0.015 to 0.46), the camera passing through. Behind them a family tree (white nodes, the couple and the consanguineous loop in teal), whose members become 100 lights that settle into a 10x10 grid: 25 teal-deep with a faint emissive glow, 75 light dots. The sky shader calms from sun-warm to the canvas as the chance resolves. Copy layers ride three scroll windows (0.13-0.38, 0.34-0.6, 0.62-1.0), each blurring in and out over 6% of progress. Without WebGL the text and actions stand alone; under reduced motion the scene renders the resolved still and the beats render as a static three-column list.

### Lattice Band
The closing CTA band: sand ground, hairline top border, the star motif as a 44px SVG pattern in brand-600 at 7% opacity, headline and one pill CTA start-aligned.

### Motion
Reveals use expo-out `cubic-bezier(.16,1,.3,1)`: the hero copy assembles from 48px below and 14px blur over 1.1s, staggered 0.04s / 0.2s / 0.32s; app content rises 14px over 0.7s. Scroll is followed with time-based smoothing that settles in about 0.35s, so slow devices track as closely as fast ones; at rest the ambient sway redraws at about 15fps. The Statement brightens word by word (14% to full) as it crosses the viewport. Reduced motion (OS setting or the in-app toggle) collapses every animation and transition to an instant, complete state.

## Do's and Don'ts

### Do:
- **Do** express every colour as a CSS variable RGB triplet with light, dark and high-contrast values.
- **Do** keep brand-600 the single action colour and indigo the single "found" colour.
- **Do** tint shadows with the ink token using the Card and Lift recipes.
- **Do** give every scroll-driven or animated piece a resolved still for reduced motion and a no-WebGL fallback.
- **Do** mirror layout, gradients, icons and 3D camera offsets in RTL.
- **Do** use the eight-point star lattice as the signature motif, at low opacity when it is decorative.

### Don't:
- **Don't** use red or green for carrier status.
- **Don't** put a label, kicker or eyebrow above a headline.
- **Don't** use the display faces on app screens; they belong to landing and persuasion headings.
- **Don't** use hard offset or untinted black shadows in light mode.
- **Don't** hard-code hex colours in components; the landing hero's lighting (three.js scene and stage gradient) is the only exception.
