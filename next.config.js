/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
       {
         protocol: 'https',
         hostname: 'lh3.googleusercontent.com',
       },
       {
         protocol: 'https',
         hostname: 'placehold.co',
       }
    ],
  },
  typescript: {
    // Set to false to see build errors. This is critical for debugging.
    ignoreBuildErrors: false,
  },
  eslint: {
    // Also disable this to see all potential issues during build
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
