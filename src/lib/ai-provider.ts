'use server';

import { googleAI } from '@genkit-ai/googleai';
import { AIConfig, AIConfigSchema } from './types';

/**
 * This is a SERVER-SIDE function that determines which AI model to use based on client-side settings.
 * It's kept separate to prevent client-side components from importing server-only code.
 * @param config The AI configuration object, passed from the client.
 * @param modelType The type of model needed ('text' or 'vision').
 * @returns A Genkit model instance.
 */
export async function getModel(clientConfig?: AIConfig, modelType: 'text' | 'vision' = 'text'): Promise<any> {
    
  // Define default models
  const defaultTextModel = 'googleai/gemini-pro';
  const defaultVisionModel = 'googleai/gemini-pro-vision';

  // Determine the correct model name
  let modelName;
  if (modelType === 'vision') {
    modelName = defaultVisionModel;
  } else {
     // Use the model from client config if available and valid, otherwise fallback to default
    modelName = clientConfig?.google.model ? `googleai/${clientConfig.google.model}` : defaultTextModel;
  }
  
  // Return the specified model instance
  return googleAI.model(modelName as any);
}
