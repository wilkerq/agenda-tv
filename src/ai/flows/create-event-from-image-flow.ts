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
        const visionModel = await getModel(undefined, 'vision');

        const prompt = ai.definePrompt({
            name: 'createEventFromImagePrompt',
            model: visionModel,
            input: { schema: CreateEventFromImageInputSchema },
            output: { schema: CreateEventFromImageOutputSchema },
            prompt: `You are an automation robot for the Goiás Legislative Assembly (Alego). Your sole function is to extract event details from an event image and apply a fixed set of business rules to populate a form. The current year is 2024. Your output MUST conform to the JSON schema.

**MANDATORY TWO-STEP PROCESS:**

**Step 1: Data Extraction from Image**
First, analyze the image to extract the following raw data.

1.  **Event Name (name):** Extract the full, detailed event name.
2.  **Location (location):** Extract the specific location (e.g., "Plenário Iris Rezende", "Auditório Carlos Vieira"). If a building name is provided, infer the most important hall within it. For example, if you see "Assembleia Legislativa", infer "Plenário Iris Rezende Machado".
3.  **Date (date):** Extract the event date from the image. Format it as 'YYYY-MM-DD'.
4.  **Time (time):** Extract the event time from the image. Format it as 'HH:mm'. If you cannot find a specific time, you MUST return \`null\` for this field. Do not invent a time.

**Step 2: Business Rule Application (Mandatory Logic)**
After extracting the data, apply the following rules to populate the remaining fields. THESE RULES ARE ABSOLUTE AND MUST BE FOLLOWED.

1.  **Transmission Rule (transmission):**
    *   If the extracted location is "Plenário Iris Rezende Machado", you MUST set the transmission to "tv".
    *   For ALL other locations, you MUST set the transmission to "youtube".

2.  **Operator Assignment Rule (operator):**
    *   You MUST assign an operator by following this hierarchy. The first rule that matches determines the operator. Do not assign "Wilker Quirino".

    *   **Rule 1: Specific Location (Highest Priority)**
        *   If the location is "Sala Julio da Retifica \"CCJR\"", the operator MUST be "Mário Augusto".

    *   **Rule 2: Weekday Shifts (Default Logic)**
        *   **Morning (00:00 - 12:00):** The default operator is "Rodrigo Sousa". He should always be assigned unless he is already busy.
        *   **Afternoon (12:01 - 18:00):** The operator MUST be one of the following: "Ovidio Dias", "Mário Augusto", or "Bruno Michel". Choose one at random. This rotation is only for the afternoon.
        *   **Night (after 18:00):** The default operator is "Bruno Michel". He should always be assigned unless he is already busy.

**Image for Analysis:**
{{media url=photoDataUri}}
`,
        });

        const { output } = await prompt(input);
        return output!;
    }
);
