'use server';

import { googleAI } from '@genkit-ai/googleai';
import { AIConfig } from './types';

/**
 * This is a SERVER-SIDE function that determines which AI model to use based on client-side settings.
 * It's kept separate to prevent client-side components from importing server-only code.
 * @param clientConfig The AI configuration object, passed from the client.
 * @param modelType The type of model needed ('text' or 'vision').
 * @returns A Genkit model instance.
 */
export async function getModel(clientConfig?: AIConfig, modelType: 'text' | 'vision' = 'text'): Promise<any> {
    
  // The provider logic is simplified as we are defaulting to Google.
  // The selected text model (e.g., gemini-1.5-flash-latest) is already multimodal and can handle vision.
  const modelName = clientConfig?.google?.model || 'gemini-1.5-flash-latest';
  return googleAI.model(modelName);
}
