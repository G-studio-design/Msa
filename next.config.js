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
    // Set to false to see all build errors, which is crucial for debugging.
    // We will fix all errors so this can eventually be true.
    ignoreBuildErrors: false,
  },
  eslint: {
    // It's better to see lint errors during build.
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
