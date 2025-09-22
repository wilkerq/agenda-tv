'use server';

import { googleAI } from '@genkit-ai/googleai';

/**
 * This is a SERVER-SIDE function that determines which AI model to use.
 * It's kept separate to prevent client-side components from importing server-only code.
 * @param modelType The type of model needed ('text' or 'vision').
 * @returns A Genkit model instance.
 */
export async function getModel(modelType: 'text' | 'vision' = 'text'): Promise<any> {
    
  // The selected text model (e.g., gemini-1.5-flash-latest) is already multimodal and can handle vision.
  const modelName = 'gemini-1.5-flash-latest';
  return googleAI.model(modelName);
}
