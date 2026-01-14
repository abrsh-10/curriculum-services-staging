/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone',
  // Ignore ESLint errors during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable monorepo support
  transpilePackages: [
    '@curriculum-services/auth',
    '@curriculum-services/roles',
    '@curriculum-services/training-components',
    '@curriculum-services/ui'
  ],
  images: {
    domains: ['143.198.54.56', '164.90.209.220', 'storage-prod.icogacc.com']
  },
  // any other Next.js config options you need
}

export default nextConfig; 