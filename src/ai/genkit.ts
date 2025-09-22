import {genkit, GenerationCommonConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from '@genkit-ai/openai';
import 'dotenv/config';

// IMPORTANT: Do not import tools here that also import `ai` from this file.
// It will cause a circular dependency. Tools should be defined and configured
// in their own files and then imported for side-effects in dev.ts or a flow.

const defaultConfig: GenerationCommonConfig = {
  // Model is now determined dynamically by getModel(), so we remove it from the default config.
};

// Initialize plugins. Keys are pulled from .env.
// The actual selection of which model/provider to use is handled
// by `getModel()` based on the user's settings.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
    openAI({
        apiKey: process.env.OPENAI_API_KEY
    })
  ],
});
