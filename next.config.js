/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Enable source maps in development
  productionBrowserSourceMaps: false,
  images: {
    formats: ['image/webp'],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/a/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      }
    ],
  },
  // Ensure environment variables are loaded
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEO4J_URI: process.env.NEO4J_URI,
    NEO4J_USER: process.env.NEO4J_USER,
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
    PROD_NEO4J_URI: process.env.PROD_NEO4J_URI,
    PROD_NEO4J_USER: process.env.PROD_NEO4J_USER,
    PROD_NEO4J_PASSWORD: process.env.PROD_NEO4J_PASSWORD,
    GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
    FRONTEND_URL: process.env.FRONTEND_URL
  }
}

module.exports = nextConfig
