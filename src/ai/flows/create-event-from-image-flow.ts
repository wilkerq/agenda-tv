
'use server';
/**
 * @fileOverview A flow for creating an event from an image using AI.
 *
 * - createEventFromImage - A function that extracts event details from an image.
 */

import { ai } from '@/ai/genkit';
import { 
    CreateEventFromImageInput, 
    CreateEventFromImageInputSchema, 
    CreateEventFromImageOutput, 
    CreateEventFromImageOutputSchema 
} from '@/lib/types';
import { z } from 'zod';

export async function createEventFromImage(input: CreateEventFromImageInput): Promise<CreateEventFromImageOutput> {
    return createEventFromImageFlow(input);
}

const prompt = ai.definePrompt(
  {
    name: 'createEventFromImagePrompt',
    input: { schema: CreateEventFromImageInputSchema },
    output: { schema: CreateEventFromImageOutputSchema },
    prompt: `
      Você é um assistente especialista em extrair informações de imagens para agendamento de eventos.
      Analise a imagem fornecida e extraia os seguintes detalhes do evento:
      - Nome do evento
      - Local
      - Data (no formato YYYY-MM-DD)
      - Hora (no formato HH:mm)

      Se alguma informação não estiver presente na imagem, deixe o campo correspondente vazio.
      
      Imagem: {{media url=photoDataUri}}
    `,
  }
);


const createEventFromImageFlow = ai.defineFlow(
    {
        name: 'createEventFromImageFlow',
        inputSchema: CreateEventFromImageInputSchema,
        outputSchema: CreateEventFromImageOutputSchema,
    },
    async (input) => {
        
        const llmResponse = await prompt(input);
        const output = llmResponse.output();

        if (!output) {
          throw new Error("A IA não conseguiu gerar uma resposta válida.");
        }

        // Retorne o resultado diretamente, pois já está no formato correto
        return output;
    }
);
