/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  // Workaround para bug conhecido do Clerk + Next.js 15.5
  // https://github.com/clerk/javascript/issues/3791
  output: 'standalone', // Força build standalone sem static export problemático
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    optimizePackageImports: ['@clerk/nextjs'],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  }
}

module.exports = nextConfig
