import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export', // مفعل لإنشاء ملفات ثابتة للـ Firebase Hosting
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['firebase'],
  },
};

export default nextConfig;