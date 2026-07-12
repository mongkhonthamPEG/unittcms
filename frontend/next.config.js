const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Without this, Next auto-detects the pnpm workspace root (repo root) and
  // nests the standalone output under frontend/, breaking the Dockerfile's
  // flat-layout assumptions (server.js, .next/, node_modules/ at /app).
  // On Next 14 this option only takes effect under `experimental`.
  experimental: {
    outputFileTracingRoot: __dirname,
  },
};

module.exports = withNextIntl(nextConfig);
