/** @type {import('next').NextConfig} */
const api = process.env.KINSIGHT_API_URL || "http://localhost:8000";
const dev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. The only cross-origin calls are the live reference lookups in lib/clinvar.ts and lib/gnomad.ts.
// ponytail: scripts need 'unsafe-inline' because Next injects its bootstrap inline; nonces would make every page dynamic.
// Upgrade path: a nonce middleware plus `experimental.sri`, once pages no longer need static prerendering.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://eutils.ncbi.nlm.nih.gov https://gnomad.broadinstitute.org${dev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const headers = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

export default {
  // e2e builds go to their own folder so they never clobber a running dev server
  distDir: process.env.NEXT_DIST || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers }];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};
