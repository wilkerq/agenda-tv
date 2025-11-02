/**
 * @fileOverview Initializes and configures the Genkit AI instance.
 * This file sets up the necessary plugins for the AI functionalities.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize plugins for Google AI.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
