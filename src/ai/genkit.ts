
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// IMPORTANT: Do not import tools here that also import `ai` from this file.
// It will cause a circular dependency. Tools should be defined and configured
// in their own files and then imported for side-effects in dev.ts or a flow.

export const ai = genkit({
  plugins: [googleAI()],
  model: 'gemini-1.5-flash-latest',
  // Tools are loaded dynamically by flows that need them.
});
