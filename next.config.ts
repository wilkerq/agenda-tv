
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["https://6000-firebase-agenda-alego-openai-1758635925178.cluster-qhrn7lb3szcfcud6uanedbkjnm.cloudworkstations.dev"]
    },
  },
};

export default nextConfig;
