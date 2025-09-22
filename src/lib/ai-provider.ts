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
    
  const provider = clientConfig?.provider || 'google';

  if (provider === 'openai') {
    // OpenAI provider is not configured. Defaulting to Google.
    // In a real application, you would handle this case, perhaps by throwing an error
    // or falling back to a default model.
    console.warn("OpenAI provider selected but not configured. Falling back to Google Gemini.");
  }

  // Default to Google
  if (modelType === 'vision') {
    return googleAI.model('gemini-pro-vision');
  }

  const modelName = clientConfig?.google?.model || 'gemini-1.5-flash-latest';
  return googleAI.model(modelName);
}
