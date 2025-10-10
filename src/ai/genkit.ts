'use server';
/**
 * @fileOverview Initializes and configures the Genkit AI instance.
 * This file sets up the necessary plugins for the AI functionalities.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import 'dotenv/config';

// Initialize plugins for Google AI.
// The 'use server' directive is crucial for Next.js Server Actions.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
