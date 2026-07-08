// © 2025 The Founded Project LLC — All rights reserved.
// next.config.js — Build optimizations for Railway deployment

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip TypeScript type-checking and ESLint during `npm run build`
  // to reduce build time on Railway (avoids 40-min timeout).
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
}

module.exports = nextConfig
