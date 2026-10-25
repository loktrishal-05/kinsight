import type { Config } from "tailwindcss";

// Colours are CSS variables (see globals.css) so light, dark and high-contrast share one set of class names.
// Palette idea: deep teal (care, calm) + warm sand (human) + indigo for "found" (never red/green for carrier status).
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"), surface: v("surface"), sunk: v("sunk"), ink: v("ink"), muted: v("muted"), line: v("line"),
        onbrand: v("onbrand"), deep: v("deep"), deepfg: v("deepfg"), sand: v("sand"),
        brand: { 50: v("b50"), 100: v("b100"), 200: v("b200"), 500: v("b500"), 600: v("b600"), 700: v("b700"), 800: v("b800") },
        found: { bg: v("found-bg"), fg: v("found-fg") },
        clear: { bg: v("clear-bg"), fg: v("clear-fg") },
        unsure: { bg: v("unsure-bg"), fg: v("unsure-fg") },
        note: { bg: v("note-bg"), fg: v("note-fg"), line: v("note-line") },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', '"Noto Sans Arabic Variable"', "system-ui", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow) / .06), 0 8px 24px -12px rgb(var(--shadow) / .14)",
        lift: "0 2px 4px rgb(var(--shadow) / .08), 0 18px 40px -16px rgb(var(--shadow) / .28)",
      },
      maxWidth: { read: "68ch" },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "none" } },
        draw: { to: { "stroke-dashoffset": "0" } },
        pulseSoft: { "0%,100%": { opacity: ".55" }, "50%": { opacity: "1" } },
        drift: { "0%": { transform: "translate3d(0,0,0)" }, "100%": { transform: "translate3d(0,-14px,0)" } },
      },
      animation: {
        rise: "rise .7s cubic-bezier(.16,1,.3,1) both",
        draw: "draw 2.2s cubic-bezier(.65,0,.35,1) forwards",
        pulseSoft: "pulseSoft 3.4s ease-in-out infinite",
        drift: "drift 9s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
} satisfies Config;
