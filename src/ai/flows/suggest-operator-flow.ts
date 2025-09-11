
'use server';
/**
 * @fileOverview A flow for suggesting an event operator based on scheduling rules.
 *
 * - suggestOperator - A function that suggests an operator based on event details.
 * - SuggestOperatorInput - The input type for the suggestOperator function.
 * - SuggestOperatorOutput - The return type for the suggestOperator function.
 */

import { ai } from '@/ai/genkit';
import { getEventsForDay } from '@/lib/tools';
import { z } from 'zod';

export const SuggestOperatorInputSchema = z.object({
  date: z.string().describe("The full date and time of the event in ISO 8601 format."),
  location: z.string().describe("The venue or place where the event will occur."),
});
export type SuggestOperatorInput = z.infer<typeof SuggestOperatorInputSchema>;

export const SuggestOperatorOutputSchema = z.object({
  operator: z.string().optional().describe('The suggested operator for the event.'),
});
export type SuggestOperatorOutput = z.infer<typeof SuggestOperatorOutputSchema>;


export async function suggestOperator(input: SuggestOperatorInput): Promise<SuggestOperatorOutput> {
    return suggestOperatorFlow(input);
}


const prompt = ai.definePrompt({
    name: 'suggestOperatorPrompt',
    input: { schema: SuggestOperatorInputSchema },
    output: { schema: SuggestOperatorOutputSchema },
    tools: [getEventsForDay],
    prompt: `You are an expert event scheduler for the Goias Legislative Assembly (Alego). Your task is to assign an operator to an event based on a strict set of hierarchical rules. You MUST use the provided tools to check the existing schedule. The current year is ${new Date().getFullYear()}.

**Step-by-Step Process:**

1.  **Check Existing Schedule:**
    *   You are given the event's date and time. You MUST call the \`getEventsForDay\` tool to see if other events are already scheduled for that day. This is a mandatory step.

2.  **Assign Operator (operator):**
    *   You MUST assign an operator based on the following hierarchy of rules. The first rule that matches determines the operator.

    *   **Rule 1: Specific Location (Highest Priority)**
        *   If the location is "Sala Julio da Retifica \"CCJ\"", the operator MUST be "Mário Augusto", regardless of any other rule.

    *   **Rule 2: Weekend Rotation**
        *   If the event is on a Saturday or Sunday, you MUST implement a rotation. Use the \`getEventsForDay\` tool result to see who worked the last weekend event and assign a different operator from the main pool: ["Rodrigo Sousa", "Mário Augusto", "Ovidio Dias", "Bruno Almeida"].

    *   **Rule 3: Weekday Shifts (Default Logic)**
        *   The event time is provided in the 'date' input field.
        *   **Morning (00:00 - 12:00):**
            *   Default operator is "Rodrigo Sousa".
            *   If the tool call shows another event already in the morning, you MUST assign either "Ovidio Dias" or "Mário Augusto".
        *   **Afternoon (12:01 - 18:00):**
            *   The operator MUST be one of "Ovidio Dias", "Mário Augusto", or "Bruno Almeida". Choose one.
        *   **Night (after 18:00):**
            *   Default operator is "Bruno Almeida".
            *   If the tool call shows another event already at night, you MUST assign either "Mário Augusto" or "Ovidio Dias".

**Input Event Details:**
- **Date and Time:** {{{date}}}
- **Location:** {{{location}}}

Your final output must be a JSON object with only the "operator" field filled with the name you determined.
`,
});

const suggestOperatorFlow = ai.defineFlow(
    {
        name: 'suggestOperatorFlow',
        inputSchema: SuggestOperatorInputSchema,
        outputSchema: SuggestOperatorOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
