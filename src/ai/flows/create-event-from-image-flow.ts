
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
    prompt: `You are a highly precise event scheduler for the Goias Legislative Assembly (Alego). Your task is to extract event details from an image and a user description. You MUST follow all rules without deviation. The current year is ${new Date().getFullYear()}.

    From the provided image and description, you will fill in the event details according to these strict rules:

    1.  **Event Name (name):** You MUST extract the full, complete name of the event. Do not use abbreviations.
    2.  **Date and Time (date):** You MUST extract the full date and the exact time of the event. The output for this field MUST be a single string in the 'YYYY-MM-DDTHH:mm:ss.sssZ' ISO 8601 format. This is a critical requirement.
    3.  **Location (location):** Extract the venue or place where the event will occur.
    4.  **Transmission (transmission):** This is a mandatory rule based on the event name.
        - If the event name you extract contains the word "Sessão" or "Comissão", you MUST set the transmission to "tv".
        - For ALL other events (like "Audiência Pública", "Solenidade", etc.), you MUST set the transmission to "youtube".
        - The user's description can only override this rule if they explicitly state a different transmission type.
    5.  **Operator (operator):** This is a mandatory rule based on the event's time of day. You MUST assign the default operator.
        - **Morning events (from 00:00 to 12:00):** The operator MUST be "Rodrigo Sousa".
        - **Afternoon events (from 12:01 to 18:00):** The operator MUST be "Mário Augusto" or "Ovidio Dias". You must choose one.
        - **Night events (after 18:00):** The operator MUST be "Bruno Michel".
        - This rule is absolute, unless the user's description explicitly names a different operator.

    You must process the image as the primary source and use the user's description for context or overrides. Your final output must conform to the specified JSON schema.

    User's request for context:
    "{{description}}"

    Image to analyze:
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
