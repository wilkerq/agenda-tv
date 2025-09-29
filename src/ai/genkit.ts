import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import 'dotenv/config';

// IMPORTANT: Do not import tools here that also import `ai` from this file.
// It will cause a circular dependency. Tools should be defined and configured
// in their own files and then imported for side-effects in dev.ts or a flow.

// Initialize plugins. Keys are pulled from .env.
export const ai = genkit({
  plugins: [
    // Configure the googleAI plugin to proxy requests to the OpenAI API.
    googleAI({
      apiKey: process.env.OPENAI_API_KEY, 
    }),
  ],
});
