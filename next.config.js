/** @type {import('next').NextConfig} */
const nextConfig = {
  // The App Router is now stable in Next.js 13+ and doesn't need experimental flag
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    // This enables the built-in image optimization API
    formats: ['image/webp'],
    // Allow image processing for our test_images directory
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/a/**',
      }
    ],
  },
  webpack: (config, { isServer, dev }) => {
    // This helps Next.js find the proper Sharp installation
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: require.resolve('sharp'),
    }

    if (isServer) {
      // Handle node: protocol imports for server-side code
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        fs: false,
        path: false,
        url: false,
      }
    }

    // Configure source maps in development
    if (dev) {
      config.devtool = 'source-map';
    }

    return config
  },
  // Enable source maps in development
  productionBrowserSourceMaps: false,
  // Ensure environment variables are loaded
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
}

module.exports = nextConfig
