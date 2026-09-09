/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "bullmq", "ioredis"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("pdfkit");
    }
    return config;
  },
};

module.exports = nextConfig;
