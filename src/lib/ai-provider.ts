'use server';

import { ai } from '@/ai/genkit';

/**
 * This is a SERVER-SIDE function that determines which AI model to use.
 * It's kept separate to prevent client-side components from importing server-only code.
 * @param modelType The type of model needed ('text' or 'vision').
 * @returns A Genkit model instance configured to use an OpenAI model.
 */
export async function getModel(modelType: 'text' | 'vision' = 'text'): Promise<any> {
    
  // For OpenAI, gpt-4o is a great multimodal choice for both text and vision.
  const modelName = 'gpt-4o';
  
  // We reference the model through the centrally configured `ai` object.
  // The googleAI plugin is acting as a proxy to OpenAI.
  return ai.model(modelName);
}
