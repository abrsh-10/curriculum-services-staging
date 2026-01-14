/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // your experimental features if any
  },
  images: {
    domains: ['143.198.54.56', 'storage-prod.icogacc.com']

  },
  // any other Next.js config options you need
}

module.exports = nextConfig 