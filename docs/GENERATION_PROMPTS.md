# Generation prompts: sign-in background video

The sign-in page (`web/app/signin/page.tsx`) plays a looping background video beside the form. Until the file exists, or when the
visitor prefers reduced motion, a still daylight lattice is shown instead, so nothing breaks.

| Use | Clip | Save as |
|---|---|---|
| Sign-in background | 1 × 8 s, seamless loop | `web/public/media/signin.mp4` (hand it over; I add the `.webm` and the `signin.jpg` poster) |

## Rules for any generator (Veo, Kling, Runway, Sora, Pika)
- 16:9, 1920×1080 or higher, 24 or 30 fps, 8 seconds, no audio.
- Slow, steady camera; smooth easing; no cuts. Last frame matches the first so it loops without a jump.
- Light, bright, premium daylight grade. Palette by hex: sand `#F4ECDC`, off-white `#F3F5F4`, teal `#1D7F7A`, deep teal `#0C5755`, ink `#18272C` only in the deepest shadows.
- No people, faces, hands or bodies. No text, letters, numbers, logos or watermarks (the app overlays its own translated text).
- The form sits on the right (on the left in Arabic, where the page mirrors). Keep the right 45% of the frame calm, bright and soft-focus.

## Prompt A (recommended): light through the lattice

> Cinematic slow dolly, moving left to right very gently, past a sunlit carved mashrabiya lattice screen made of interlocking eight-point stars in warm sand-coloured plaster (#F4ECDC). Morning sunlight from the upper right streams through the star-shaped openings and casts crisp star-patterned shadows that drift slowly across a pale off-white wall (#F3F5F4). The light passing through the openings has a soft teal tint (#1D7F7A), with the deepest shade in deep teal (#0C5755). Fine dust motes float in the light beams. Shallow depth of field: the lattice detail is sharp on the left half of the frame, while the right 45% of the frame is a calm, bright, softly blurred sand wall with only faint shadow drift. Mood: calm, private, trustworthy, premium architectural photography, daylight colour grade, high dynamic range without harsh contrast. No people, no faces, no hands, no text, no letters, no numbers, no logos, no watermark. 16:9, 1920x1080, 24 fps, 8 seconds, no audio, seamless loop where the last frame matches the first.

Negative prompt (where supported): people, face, hands, text, letters, numbers, logo, watermark, dark, night, neon, purple, glow blobs, lens flare, fast motion, camera shake, cuts, saturated colours.

## Prompt B (alternative): shadows crossing a courtyard

> Locked-off, almost still camera looking down at a quiet sunlit courtyard floor of smooth pale sand-coloured stone (#F4ECDC). The shadow of an unseen eight-point-star mashrabiya screen falls across the floor and moves very slowly, as if the sun were travelling, the star shapes stretching and softening. Gentle teal-tinted light (#1D7F7A) glows inside the shadow edges; the deepest shade is deep teal (#0C5755). The right 45% of the frame stays mostly open, bright and even. Soft breeze moves a few fine particles through the light. Calm, private, premium, daylight grade. No people, no faces, no hands, no text, no letters, no numbers, no logos, no watermark. 16:9, 1920x1080, 24 fps, 8 seconds, no audio, seamless loop where the last frame matches the first.

## After you send the file
I will convert it to `signin.webm` plus `signin.mp4` (H.264, around 2–4 MB) and a `signin.jpg` poster from the first frame, check the
loop seam, and confirm the form stays readable over every frame in English and Arabic, on desktop and phone.
