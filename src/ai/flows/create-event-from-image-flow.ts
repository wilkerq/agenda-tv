
'use server';
/**
 * @fileOverview A flow for creating an event from an image using AI.
 *
 * - createEventFromImage - A function that extracts event details from an image.
 * - CreateEventFromImageInput - The input type for the createEventFromImage function.
 * - CreateEventFromImageOutput - The return type for the createEventFromImage function.
 */

import { ai } from '@/ai/genkit';
import { 
    CreateEventFromImageInput, 
    CreateEventFromImageInputSchema, 
    CreateEventFromImageOutput, 
    CreateEventFromImageOutputSchema 
} from '@/lib/types';


export async function createEventFromImage(input: CreateEventFromImageInput): Promise<CreateEventFromImageOutput> {
    return createEventFromImageFlow(input);
}


const prompt = ai.definePrompt({
    name: 'createEventFromImagePrompt',
    input: { schema: CreateEventFromImageInputSchema },
    output: { schema: CreateEventFromImageOutputSchema },
    prompt: `You are an expert event scheduler. Your task is to extract event details from an image and a user description. The current year is ${new Date().getFullYear()}.

    The user will provide an image (like a flyer or a screenshot) and a description. Your goal is to fill in as many details as possible for the event.
    
    - name: The title or name of the event.
    - location: The venue or place where the event will happen.
    - date: The full date of the event, including the year. You must return it in YYYY-MM-DDTHH:mm:ss.sssZ format.
    - operator: The person or team responsible. If not present in the image, you can infer it from the description or leave it empty.
    - transmission: Check if it's "youtube" or "tv". If not specified, default to "youtube".

    User's request:
    "{{description}}"

    Image for context:
    {{media url=photoDataUri}}
    `,
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
