'use server';

import { openai } from '@genkit-ai/openai';

/**
 * This is a SERVER-SIDE function that determines which AI model to use.
 * It's kept separate to prevent client-side components from importing server-only code.
 * @param modelType The type of model needed ('text' or 'vision').
 * @returns A Genkit model instance from OpenAI.
 */
export async function getModel(modelType: 'text' | 'vision' = 'text'): Promise<any> {
    
  // For OpenAI, gpt-4o is a great multimodal choice for both text and vision.
  const modelName = 'gpt-4o';
  
  // Note: We use the googleAI plugin configured with an OpenAI key, 
  // so we reference the model through the googleAI object.
  // This seems counter-intuitive, but it's how Genkit can be configured to proxy to other providers.
  // To avoid confusion, we are returning a model from openai directly.
  return openai.model(modelName);
}
