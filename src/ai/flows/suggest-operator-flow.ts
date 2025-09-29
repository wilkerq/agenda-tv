'use server';
/**
 * @fileOverview A flow for suggesting an event operator and transmission type using AI.
 * It considers business rules, operator availability, and the existing schedule.
 *
 * - suggestOperator - A function that suggests an operator and transmission based on event details.
 */

import { ai } from '@/ai/genkit';
import { getModel } from '@/lib/ai-provider';
import { 
    SuggestOperatorInput, 
    SuggestOperatorInputSchema, 
    SuggestOperatorOutput, 
    SuggestOperatorOutputSchema 
} from '@/lib/types';
import { getAvailableOperators } from '@/lib/business-logic';
import { getScheduleTool } from '../tools/get-schedule-tool';

export async function suggestOperator(input: SuggestOperatorInput): Promise<SuggestOperatorOutput> {
    return suggestOperatorFlow(input);
}

const suggestOperatorFlow = ai.defineFlow(
    {
        name: 'suggestOperatorFlow',
        inputSchema: SuggestOperatorInputSchema,
        outputSchema: SuggestOperatorOutputSchema,
    },
    async (input) => {
        const textModel = await getModel();

        // 1. Get all available operators from the database (excluding "Wilker Quirino").
        const availableOperators = await getAvailableOperators();

        // 2. Define the prompt with business rules and tools.
        const prompt = ai.definePrompt({
            name: 'suggestOperatorPrompt',
            model: textModel,
            tools: [getScheduleTool],
            input: { schema: SuggestOperatorInputSchema },
            output: { schema: SuggestOperatorOutputSchema },
            prompt: `You are an expert event scheduler for the Goiás Legislative Assembly (Alego).
Your task is to suggest the best operator and determine the correct transmission type for a new event based on a strict set of business rules and real-time schedule data.

**Event Details:**
- **Date and Time:** {{{date}}}
- **Location:** {{{location}}}
- **Available Operators:** ${availableOperators.join(', ')}

**Mandatory Instructions:**

1.  **Check Schedule First:** Before making any suggestion, you MUST use the \`getSchedule\` tool to check the events already scheduled for the given date. This is critical to know which operators are already busy.

2.  **Apply Business Rules in Order:**
    *   **Rule A (Transmission Type):**
        *   If the \`location\` is "Plenário Iris Rezende Machado", the \`transmission\` MUST be "tv".
        *   For ALL other locations, the \`transmission\` MUST be "youtube".

    *   **Rule B (Operator Suggestion - Highest Priority):**
        *   If the \`location\` is "Sala Julio da Retifica \\"CCJR\\"", you MUST suggest "Mário Augusto", unless he is already scheduled for another event at a conflicting time.

    *   **Rule C (Time-Based Assignment):**
        *   **Morning (before 12:00):** Suggest "Rodrigo Sousa".
        *   **Afternoon (12:00 - 18:00):** Rotate between "Ovidio Dias", "Mário Augusto", and "Bruno Michel".
        *   **Night (after 18:00):** Suggest "Bruno Michel".
    
    *   **Rule D (Availability is KEY):**
        *   NEVER suggest an operator who is already busy at a similar time. Use the schedule data from the tool to make this decision.
        *   If your primary suggestion based on the rules is busy, choose another available operator, trying to balance the workload.
        *   If all operators are busy, which is unlikely, you can return \`null\` for the operator field.

3.  **Final Output:** Your final answer MUST be a valid JSON object matching the output schema, containing the suggested \`operator\` and the determined \`transmission\` type.`,
        });

        // 3. Run the prompt and get the structured output.
        const { output } = await prompt(input);
        
        if (!output) {
            throw new Error("The AI failed to return a valid suggestion.");
        }
        
        return output;
    }
);
