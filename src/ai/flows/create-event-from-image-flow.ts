
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

const prompt = ai.definePrompt({
    name: 'createEventFromImagePrompt',
    model: 'googleai/gemini-pro-vision',
    input: { schema: CreateEventFromImageInputSchema },
    output: { schema: CreateEventFromImageOutputSchema },
    prompt: `You are an expert event information extractor. Your task is to analyze an image (like a flyer or a screenshot) and extract the key details of an event.

    - Event Name (name): Extract the main title or name of the event.
    - Location (location): Extract the venue or location.
    - Date (date): Extract the full date and format it as 'YYYY-MM-DD'. If the year is not specified, assume the current year or the next logical year if the date has passed.
    - Time (time): Extract the start time and format it as 'HH:mm'. If no time is found, this can be null.
    - Transmission (transmission): Based on the context, determine if the event is likely to be broadcast on 'youtube' or 'tv'. If unsure, default to 'youtube'.
    
    Analyze the following image and return the extracted information in a structured JSON format.
    
    Image: {{media url=photoDataUri}}`,
});


const createEventFromImageFlow = ai.defineFlow(
    {
        name: 'createEventFromImageFlow',
        inputSchema: CreateEventFromImageInputSchema,
        outputSchema: CreateEventFromImageOutputSchema,
    },
    async (input) => {
       const { output } = await prompt(input);
       return output!;
    }
);
