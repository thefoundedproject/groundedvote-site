// © 2025 The Founded Project LLC — All rights reserved.
// next.config.js — Build optimizations for Railway deployment

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip TypeScript type-checking and ESLint during `npm run build`
  // to reduce build time on Railway (avoids 40-min timeout).
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  async redirects() {
    return [
      // Legacy/external links — the quiz flow starts at address entry
      { source: '/quiz', destination: '/align', permanent: false },
      // Canonical audit trail URL is /audit-trail (matches nav label)
      { source: '/audit', destination: '/audit-trail', permanent: true },
    ]
  },
}

module.exports = nextConfig
