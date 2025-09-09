
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
    prompt: `You are an expert event scheduler for the Goias Legislative Assembly (Alego). Your task is to extract event details from an image and a user description. The current year is ${new Date().getFullYear()}.

    The user will provide an image (like a flyer or a screenshot) and a description. Your goal is to fill in as many details as possible for the event, following these specific rules:

    1.  **Event Name (name):** Extract the full, complete name of the event. Do not abbreviate.
    2.  **Date and Time (date):** You MUST extract the full date and the exact time of the event. Return it in the YYYY-MM-DDTHH:mm:ss.sssZ format. This is critical.
    3.  **Location (location):** The venue or place where the event will happen.
    4.  **Transmission (transmission):**
        - If the event name contains "Sessão" or "Comissão", the transmission MUST be "tv".
        - For all other events, like "Audiência Pública", the default is "youtube".
        - If the user specifies a different transmission in the description, their instruction overrides these rules.
    5.  **Operator (operator):** Assign the default operator based on the time of day. This is a strict rule.
        - **Morning events (until 12:00 PM):** The default operator is "Rodrigo Sousa".
        - **Afternoon events (from 12:01 PM to 6:00 PM):** The default operator is "Mário Augusto" or "Ovidio Dias". You can choose one.
        - **Night events (after 6:00 PM):** The default operator is "Bruno Michel".
        - If the user specifies an operator in the description, their instruction takes priority.

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
