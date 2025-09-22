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
import { getModel } from '@/lib/ai-provider';

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
        const visionModel = await getModel('vision');

        const prompt = ai.definePrompt({
            name: 'createEventFromImagePrompt',
            model: visionModel,
            input: { schema: CreateEventFromImageInputSchema },
            output: { schema: CreateEventFromImageOutputSchema },
            prompt: `You are an automation robot for the Goiás Legislative Assembly (Alego). Your function is to extract event details from an image and apply business rules to populate a form. The current year is 2024. Your output MUST conform to the JSON schema.

**MANDATORY RULES:**

1.  **Data Extraction:**
    *   **Event Name (name):** Extract the full, detailed event name.
    *   **Location (location):** Extract the specific location (e.g., "Plenário Iris Rezende Machado"). If you see "Assembleia Legislativa", infer "Plenário Iris Rezende Machado". If the location is "Comissão de Constituição e Justiça", infer "Sala Julio da Retifica \"CCJR\"".
    *   **Date (date):** Extract the event date. Format it as 'YYYY-MM-DD'.
    *   **Time (time):** Extract the event time. Format it as 'HH:mm'. If you cannot find a specific time, you MUST return \`null\` for this field. Do not invent a time.

2.  **Business Logic (ABSOLUTE RULES):**
    *   **Transmission Rule (transmission):**
        *   If the extracted location is "Plenário Iris Rezende Machado", set \`transmission\` to "tv".
        *   For ALL other locations, set \`transmission\` to "youtube".
    *   **Operator Assignment Rule (operator):**
        *   Assign an operator by following this hierarchy. Do not assign "Wilker Quirino".
        *   **Rule 1 (Specific Location):** If the location is "Sala Julio da Retifica \"CCJR\"", the operator MUST be "Mário Augusto".
        *   **Rule 2 (Weekday Shifts):**
            *   **Morning (00:00 - 12:00):** The operator is "Rodrigo Sousa".
            *   **Afternoon (12:01 - 18:00):** The operator must be one of "Ovidio Dias", "Mário Augusto", or "Bruno Michel". Choose one at random.
            *   **Night (after 18:00):** The operator is "Bruno Michel".

**Image for Analysis:**
{{media url=photoDataUri}}
`,
        });

        const { output } = await prompt(input);
        return output!;
    }
);
