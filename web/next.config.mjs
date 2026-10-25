/** @type {import('next').NextConfig} */
const api = process.env.KINSIGHT_API_URL || "http://localhost:8000";
export default { async rewrites() { return [{ source: "/api/:path*", destination: `${api}/api/:path*` }]; } };
