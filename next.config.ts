
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["https://6000-firebase-agenda-alego-openai-1758635925178.cluster-qhrn7lb3szcfcud6uanedbkjnm.cloudworkstations.dev"],
      bodySizeLimit: '4.5mb',
      serverActionsTimeout: 600, // Increase timeout to 10 minutes
    },
    csrfProtection: {
      // TODO: Remove this once the Genkit SDK has a better way to handle this.
      disabledFor: ['/api/genkit/**'],
    },
  },
};

export default nextConfig;
