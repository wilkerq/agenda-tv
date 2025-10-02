'use server';

import { googleAI } from '@/ai/genkit';

/**
 * This is a SERVER-SIDE function that determines which AI model to use.
 * It's kept separate to prevent client-side components from importing server-only code.
 * @param modelType The type of model needed ('text' or 'vision').
 * @returns A Genkit model instance configured to use Gemini 1.5 Pro.
 */
export async function getModel(modelType: 'text' | 'vision' = 'text'): Promise<any> {
    
  // Use Gemini 1.5 Pro for all tasks.
  const modelName = 'gemini-1.5-pro-latest';
  
  // We reference the model through the centrally configured `ai` object.
  return googleAI.model(modelName);
}
