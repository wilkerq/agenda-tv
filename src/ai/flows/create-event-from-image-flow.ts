'use server';
/**
 * @fileOverview Server Action para criar um evento a partir de uma imagem usando IA com Vercel AI SDK.
 *
 * - createEventFromImage - Uma função que extrai detalhes do evento de uma imagem.
 */

import { generateObject } from 'ai';
import { aiVisionModel } from '@/lib/ai';
import { 
    CreateEventFromImageInput, 
    CreateEventFromImageInputSchema, 
    CreateEventFromImageOutput, 
    CreateEventFromImageOutputSchema 
} from '@/lib/types';

export async function createEventFromImage(input: CreateEventFromImageInput): Promise<CreateEventFromImageOutput> {
    // Validar a entrada com Zod
    const validatedInput = CreateEventFromImageInputSchema.parse(input);

    const { object } = await generateObject({
        model: aiVisionModel,
        schema: CreateEventFromImageOutputSchema,
        messages: [{
            role: 'user',
            content: [
                { 
                    type: 'text', 
                    text: `Você é um especialista em extrair informações de flyers e posts de eventos.
                           Analise a imagem e extraia os seguintes dados no formato JSON:
                           - name: O nome principal do evento.
                           - location: O local ou endereço.
                           - date: A data no formato YYYY-MM-DD. Assuma o ano corrente se não especificado.
                           - time: A hora de início no formato HH:mm.`
                },
                { 
                    type: 'image', 
                    image: validatedInput.photoDataUri // O SDK aceita a string base64 data URI diretamente
                }
            ]
        }]
    });

    return object;
}