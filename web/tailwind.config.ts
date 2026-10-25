import type { Config } from "tailwindcss";

// Calm, clinical-but-warm palette. No alarm colours anywhere: carrier status is shown in neutral indigo/slate.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f3f5f4",
        surface: "#ffffff",
        ink: "#18272c",
        muted: "#55656b",
        line: "#dbe2e0",
        brand: { 50: "#e8f3f1", 100: "#cfe6e2", 200: "#a4cfc8", 500: "#1d7f7a", 600: "#106b68", 700: "#0c5755", 800: "#0a4543" },
        found: { bg: "#e9ecfa", fg: "#33417f" },
        clear: { bg: "#eef1f0", fg: "#40524f" },
        unsure: { bg: "#f7eed8", fg: "#6c5114" },
        note: { bg: "#fbf4e4", fg: "#5b4510", line: "#ecdcae" },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', '"Noto Sans Arabic Variable"', "system-ui", "Segoe UI", "sans-serif"],
      },
      boxShadow: { card: "0 1px 2px rgba(24,39,44,.05), 0 4px 14px -6px rgba(24,39,44,.10)" },
      maxWidth: { read: "68ch" },
    },
  },
  plugins: [],
} satisfies Config;
