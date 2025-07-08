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
    // Set to true if you want to fail build on type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
