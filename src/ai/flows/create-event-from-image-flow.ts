
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
import { assignOperator } from '@/lib/business-logic';
import { determineTransmission } from '@/lib/event-logic';
import { parse, isValid } from 'date-fns';
import { z } from 'zod';

const VisionExtractionSchema = z.object({
  name: z.string().optional().describe('The full, detailed event name.'),
  location: z.string().optional().describe('The specific location (e.g., "Plenário Iris Rezende Machado").'),
  date: z.string().optional().describe("The event date, formatted as 'YYYY-MM-DD'."),
  time: z.string().nullable().optional().describe("The event time, formatted as 'HH:mm'. If no time is found, this MUST be null."),
});
type VisionExtraction = z.infer<typeof VisionExtractionSchema>;

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
        
        const llmResponse = await ai.generate({
            model: 'gemini-pro-vision',
            prompt: `You are an automation robot for the Goiás Legislative Assembly (Alego). Your function is to extract event details from an image. The current year is 2024. Your output MUST be a valid JSON string.

**MANDATORY RULES:**

1.  **Data Extraction:**
    *   **Event Name (name):** Extract the full, detailed event name.
    *   **Location (location):** Extract the specific location (e.g., "Plenário Iris Rezende Machado", "Comissão de Constituição e Justiça").
    *   **Date (date):** Extract the event date. Format it as 'YYYY-MM-DD'.
    *   **Time (time):** Extract the event time. Format it as 'HH:mm'. If you cannot find a specific time, you MUST return \`null\` for this field. Do not invent a time.

**Image for Analysis:**
{{media url=${input.photoDataUri}}}
`,
        });
        
        const visionText = llmResponse.text();
        if (!visionText) {
            throw new Error("Failed to get a response from the AI model.");
        }
        
        const visionOutput: VisionExtraction = JSON.parse(visionText);
        VisionExtractionSchema.parse(visionOutput);

        
        let finalDate: Date | undefined;
        let location = visionOutput.location;

        if (visionOutput.date && visionOutput.time) {
            const dateStr = `${visionOutput.date}T${visionOutput.time}`;
            const parsedDate = parse(dateStr, "yyyy-MM-dd'T'HH:mm", new Date());
            if (isValid(parsedDate)) {
                finalDate = parsedDate;
            }
        }
        
        if (location) {
            if (location.includes("Assembleia Legislativa")) location = "Plenário Iris Rezende Machado";
            if (location.includes("Comissão de Constituição e Justiça")) location = "Sala Julio da Retifica \"CCJR\"";
        }
        
        const transmission = location ? determineTransmission(location) : undefined;
        const operator = (finalDate && location) ? await assignOperator(finalDate, location) : undefined;

        const finalOutput: CreateEventFromImageOutput = {
            name: visionOutput.name,
            location: location,
            date: visionOutput.date,
            time: visionOutput.time,
            transmission: transmission,
            operator: operator,
        };

        return finalOutput;
    }
);
