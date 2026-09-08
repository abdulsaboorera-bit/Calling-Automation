/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["twilio", "pdfkit", "bullmq", "ioredis"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("pdfkit");
    }
    return config;
  },
};

module.exports = nextConfig;
