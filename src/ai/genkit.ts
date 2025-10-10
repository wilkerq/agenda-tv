'use server';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import 'dotenv/config';

// IMPORTANT: Do not import tools here that also import `ai` from this file.
// It will cause a circular dependency. Tools should be defined and configured
// in their own files and then imported for side-effects in dev.ts or a flow.

// Initialize plugins.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
