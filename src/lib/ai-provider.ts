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
    
  const provider = clientConfig?.provider || 'google';

  if (modelType === 'vision') {
    // For vision tasks, Google's model is generally preferred and hardcoded for now.
    // This could be expanded later if needed.
    return googleAI.model('googleai/gemini-pro-vision');
  }
  
  if (provider === 'openai') {
    // This part is now effectively disabled as the openai package is removed.
    // We will default to Google to prevent errors.
    console.warn("OpenAI provider selected, but the package is not installed. Defaulting to Google Gemini.");
  }

  // Default to Google
  const modelName = clientConfig?.google?.model || 'gemini-1.5-flash-latest';
  return googleAI.model(`googleai/${modelName}`);
}
