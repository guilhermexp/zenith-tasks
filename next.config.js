/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
}

module.exports = nextConfig
