import {genkit} from 'genkit';
import {googleAI as googleAIPlugin} from '@genkit-ai/googleai';
import 'dotenv/config';

// IMPORTANT: Do not import tools here that also import `ai` from this file.
// It will cause a circular dependency. Tools should be defined and configured
// in their own files and then imported for side-effects in dev.ts or a flow.

// Configure the googleAI plugin to proxy requests to the OpenAI API.
export const googleAI = googleAIPlugin({
  apiKey: process.env.OPENAI_API_KEY, 
});

// Initialize plugins. Keys are pulled from .env.
export const ai = genkit({
  plugins: [
    googleAI,
  ],
});
