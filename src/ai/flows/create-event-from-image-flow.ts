
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


export async function createEventFromImage(input: CreateEventFromImageInput): Promise<CreateEventFromImageOutput> {
    return createEventFromImageFlow(input);
}


const prompt = ai.definePrompt({
    name: 'createEventFromImagePrompt',
    model: 'googleai/gemini-pro-vision',
    input: { schema: CreateEventFromImageInputSchema },
    output: { schema: CreateEventFromImageOutputSchema },
    prompt: `You are a highly precise event scheduler for the Goias Legislative Assembly (Alego). Your task is to extract event details from an image with high accuracy and assign operators based on a strict set of rules. The current year is ${new Date().getFullYear()}.

Your final output must conform to the specified JSON schema.

**Part 1: Data Extraction**

From the provided image and user description, you will fill in the event details. You MUST follow all extraction rules without deviation.

1.  **Event Name (name):** Extract the full, complete name of the event (e.g., "Sessão Solene de Homenagem"). Do not use abbreviations.
2.  **Location (location):** Extract the specific venue (e.g., "Plenário Iris Rezende Machado", "Auditório Carlos Vieira", "Sala Julio da Retifica \"CCJR\""). If a building name is given, infer the most important hall within it. Do not include generic phrases like "na Alego" if the location is already a specific room in the assembly.
3.  **Date and Time (date):** Extract the full date and the exact time (24h format). You MUST combine them into a single string in the 'YYYY-MM-DDTHH:mm:ss.sssZ' ISO 8601 format. This is a critical requirement. If you cannot determine the full date and time, do not proceed.
4.  **YouTube Link:** If a YouTube URL is clearly visible, extract it. Otherwise, ignore this field.

**Part 2: Business Logic and Operator Assignment**

After extracting the data, you will apply the following business rules.

1.  **Determine Transmission Type:**
    *   This is a mandatory rule based on the event name.
    *   If the event name contains "Sessão" or "Comissão", you MUST set the transmission to "tv".
    *   For ALL other events (e.g., "Audiência Pública", "Solenidade"), you MUST set the transmission to "youtube".
    *   Only a user's explicit instruction (e.g., "transmitir na tv") can override this rule.

2.  **Assign Operator (operator):**
    *   You MUST assign an operator based on the following hierarchy of rules. The first rule that matches determines the operator.

    *   **Rule 1: Specific Location (Highest Priority)**
        *   If the location is "Sala Julio da Retifica \"CCJR\"", the operator MUST be "Mário Augusto", regardless of any other rule.

    *   **Rule 2: Weekend Rotation**
        *   If the event is on a Saturday or Sunday, you MUST assign one operator from the main pool: ["Rodrigo Sousa", "Mário Augusto", "Ovidio Dias"]. Pick one at random.

    *   **Rule 3: Weekday Shifts (Default Logic)**
        *   **Morning (00:00 - 12:00):**
            *   Default operator is "Rodrigo Sousa".
        *   **Afternoon (12:01 - 18:00):**
            *   The operator MUST be one of "Ovidio Dias", "Mário Augusto", or "Bruno Michel". Choose one.
        *   **Night (after 18:00):**
            *   Default operator is "Mário Augusto".

    *   **Rule 4: User Override (Lowest Priority)**
        *   If the user's description explicitly names an operator (e.g., "O operador será o João"), this overrides all other rules.


**Context from user:**
"{{description}}"

**Image to analyze:**
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
