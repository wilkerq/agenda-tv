
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// IMPORTANT: Do not import tools here that also import `ai` from this file.
// It will cause a circular dependency. Tools should be defined and configured
// in their own files and then imported for side-effects in dev.ts or a flow.

export const ai = genkit({
  plugins: [
    googleAI({
      // A default model can be specified for all generate calls.
      // We are using a stable model here to avoid 404 errors.
      model: 'gemini-pro',
    }),
  ],
});
