'use server';

import { googleAI } from '@genkit-ai/googleai';
import { AIConfig } from './types';

/**
 * This is a SERVER-SIDE function that determines which AI model to use based on client-side settings.
 * It's kept separate to prevent client-side components from importing server-only code.
 * @param config The AI configuration object, passed from the client.
 * @param modelType The type of model needed ('text' or 'vision').
 * @returns A Genkit model instance.
 */
export async function getModel(clientConfig?: AIConfig, modelType: 'text' | 'vision' = 'text'): Promise<any> {
    
  // Define default models
  const defaultTextModel = 'gemini-pro';
  const defaultVisionModel = 'gemini-pro-vision';

  // Determine the correct model name
  let modelName: string;

  if (modelType === 'vision') {
    // For vision tasks, always use the specific vision model.
    modelName = defaultVisionModel;
  } else {
    // For text tasks, use the model from client config if available, otherwise fallback to default.
    modelName = clientConfig?.google?.model || defaultTextModel;
  }
  
  // Return the specified model instance, correctly prefixed for Genkit.
  return googleAI.model(`googleai/${modelName}`);
}
