import type { Config } from "tailwindcss";
// Neutral calm palette: no alarm colours for carrier status.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#1f2a37", calm: "#e8eef3", accent: "#2f6f8f", note: "#f4efe6" } } },
  plugins: [],
} satisfies Config;
