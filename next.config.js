/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    optimizePackageImports: ['@clerk/nextjs'],
  },
  typescript: {
    ignoreBuildErrors: false,
  }
}

module.exports = nextConfig
