/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker imaji icin minimal sunucu cikti klasoru (.next/standalone)
  output: 'standalone',

  images: {
    formats: ['image/avif', 'image/webp'],
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
  },

  env: {
    NEXT_PUBLIC_MEDUSA_BACKEND_URL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
    NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  },

  // WordPress / WooCommerce gecisi 301 kalici yonlendirme haritasi
  async redirects() {
    return [
      // Ana magaza sayfasi
      {
        source: '/shop',
        destination: '/products',
        permanent: true,
      },
      // Sayfalanmis magaza URL'leri
      {
        source: '/shop/page/:page(\\d+)',
        destination: '/products?page=:page',
        permanent: true,
      },
      // WordPress alt kategori / urun yollari
      {
        source: '/shop/accessories/:slug*',
        destination: '/products/:slug*',
        permanent: true,
      },
      // WordPress urun kategorileri
      {
        source: '/product-category/:slug*',
        destination: '/categories/:slug*',
        permanent: true,
      },
      // WordPress tekil urun yollari
      {
        source: '/product/:slug*',
        destination: '/products/:slug*',
        permanent: true,
      },
      {
        source: '/games/:slug*',
        destination: '/products/:slug*',
        permanent: true,
      },
      // WordPress hesap yollari
      {
        source: '/my-account',
        destination: '/account',
        permanent: true,
      },
      {
        source: '/my-account/:path*',
        destination: '/account/:path*',
        permanent: true,
      },
    ]
  },

  // Guvenlik basliklari (Security Headers)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
