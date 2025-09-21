
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {},
  },
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
};

export default nextConfig;
