
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

const createEventFromImageFlow = ai.defineFlow(
    {
        name: 'createEventFromImageFlow',
        inputSchema: CreateEventFromImageInputSchema,
        outputSchema: CreateEventFromImageOutputSchema,
    },
    async (input) => {
        
        // AI Call Disabled to prevent 404 errors. Returning a default object.
        console.warn("AI call in createEventFromImageFlow is disabled. Returning default empty object.");

        const finalOutput: CreateEventFromImageOutput = {
            name: "",
            location: undefined,
            date: undefined,
            time: null,
            transmission: "youtube",
            operator: undefined,
        };

        return finalOutput;
    }
);
