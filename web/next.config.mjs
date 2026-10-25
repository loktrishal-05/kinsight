/** @type {import('next').NextConfig} */
const api = process.env.KINSIGHT_API_URL || "http://localhost:8000";
export default {
  // e2e builds go to their own folder so they never clobber a running dev server
  distDir: process.env.NEXT_DIST || ".next",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};
