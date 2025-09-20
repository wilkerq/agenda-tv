'use server';

import { googleAI } from '@genkit-ai/googleai';

/**
 * This is a SERVER-SIDE function that determines which AI model to use.
 * It's kept separate to prevent client-side components from importing server-only code.
 */
export async function getModel(): Promise<any> {
  // For now, we are defaulting to a specific Gemini model.
  // This could be extended to read from a server-side config or environment variables
  // to dynamically switch between models or providers.
  return googleAI.model('gemini-1.5-flash-latest');
}
