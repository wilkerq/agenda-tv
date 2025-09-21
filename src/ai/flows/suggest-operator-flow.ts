'use server';
/**
 * @fileOverview A flow for suggesting an event operator based on scheduling rules.
 *
 * - suggestOperator - A function that suggests an operator based on event details.
 */

import { ai } from '@/ai/genkit';
import { getEventsForDay } from '@/lib/tools';
import { 
    SuggestOperatorInput as OriginalSuggestOperatorInput,
    SuggestOperatorOutput,
    SuggestOperatorOutputSchema 
} from '@/lib/types';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { z } from 'zod';

// Extend the input to include the list of available operators
const SuggestOperatorInputSchema = z.object({
  date: z.string().describe("The full date and time of the event in ISO 8601 format."),
  location: z.string().describe("The venue or place where the event will occur."),
  availableOperators: z.array(z.string()).describe("A list of all available operator names to choose from."),
});
export type SuggestOperatorInput = z.infer<typeof SuggestOperatorInputSchema>;


export async function suggestOperator(input: OriginalSuggestOperatorInput): Promise<SuggestOperatorOutput> {
    return suggestOperatorFlow(input);
}


const prompt = ai.definePrompt({
    name: 'suggestOperatorPrompt',
    model: 'gemini-pro',
    input: { schema: SuggestOperatorInputSchema },
    output: { schema: SuggestOperatorOutputSchema },
    tools: [getEventsForDay],
    prompt: `You are an expert scheduling assistant for Alego. Your task is to determine the most suitable operator for an event by following a strict hierarchy of rules. You must use the 'getEventsForDay' tool to check the schedule before making a decision. The current year is 2024.

**AVAILABLE OPERATORS:**
{{#each availableOperators}}
- {{{this}}}
{{/each}}

**MANDATORY PROCESS:**

1.  **Consult Schedule (Step 1):**
    *   First, you MUST use the \`getEventsForDay\` tool to retrieve the list of events already scheduled for the given date. This is essential for context.

2.  **Apply Assignment Rules (Step 2):**
    *   Based on the tool's result and the event details, apply the following rule hierarchy. The first rule that matches determines the operator.
    *   You MUST choose an operator from the "AVAILABLE OPERATORS" list. Do NOT choose "Wilker Quirino".
    *   After determining the operator, your only job is to return their name in the 'operator' field. **Do NOT call any more tools.**

**RULE HIERARCHY:**

*   **Rule 1: Specific Location (Highest Priority)**
    *   If the location is "Sala Julio da Retifica \"CCJR\"", the operator MUST be "Mário Augusto" (if he is in the available list).

*   **Rule 2: Weekday Shifts (Monday to Friday)**
    *   **Morning (00:00 - 12:00):**
        *   The primary operator is "Rodrigo Sousa".
        *   Use the tool to check his schedule. If "Rodrigo Sousa" is **free**, you MUST assign him.
        *   If he is already assigned to another event, you MUST assign another available operator from the list.
    *   **Afternoon (12:01 - 18:00):**
        *   Rotate between the available operators ("Ovidio Dias", "Mário Augusto", "Bruno Michel"), considering who is already scheduled to avoid overloading.
    *   **Night (after 18:00):**
        *   The primary operator is "Bruno Michel".
        *   Use the tool to check his schedule. If "Bruno Michel" is **free**, you MUST assign him.
        *   If he is already assigned to another event at night, you MUST assign another available operator from the list.
*   **Rule 3: Weekend Rotation (Saturday and Sunday)**
    *   If the event is on a weekend, use the result from the \`getEventsForDay\` tool to see who worked the last weekend event and assign a **different** operator from the available list to ensure rotation.

**Event Details for Analysis:**
- **Date and Time:** {{{date}}}
- **Location:** {{{location}}}

Your final output must be a JSON object containing only the "operator" field.
`,
});

const suggestOperatorFlow = ai.defineFlow(
    {
        name: 'suggestOperatorFlow',
        inputSchema: z.object({
          date: z.string(),
          location: z.string(),
        }),
        outputSchema: SuggestOperatorOutputSchema,
    },
    async (input) => {
        // 1. Fetch operators from Firestore and filter out 'Wilker Quirino'
        const operatorsCollection = collection(db, 'operators');
        const operatorsSnapshot = await getDocs(query(operatorsCollection));
        const availableOperators = operatorsSnapshot.docs
            .map(doc => doc.data().name as string)
            .filter(name => name !== 'Wilker Quirino');

        if (availableOperators.length === 0) {
            console.warn("No available operators found in the database (excluding Wilker Quirino). Cannot suggest an operator.");
            return { operator: undefined };
        }
        
        // 2. Call the prompt with the dynamic list of operators
        const { output } = await prompt({
            ...input,
            availableOperators,
        });

        // Handle cases where the LLM returns null instead of a valid JSON object
        if (output === null) {
            console.warn("LLM returned null, defaulting to undefined operator.");
            return { operator: undefined };
        }

        return output;
    }
);
