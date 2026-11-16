/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker imaji icin minimal sunucu cikti klasoru (.next/standalone)
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true, // Geliştirme sırasında cache sorunlarını önler
  },
  env: {
    NEXT_PUBLIC_MEDUSA_BACKEND_URL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
    NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  },
}

module.exports = nextConfig

