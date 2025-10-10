
'use server';
/**
 * @fileOverview A flow for suggesting an event operator and transmission type using AI.
 * It considers business rules, operator availability, and the existing schedule.
 *
 * - suggestOperator - A function that suggests an operator and transmission based on event details.
 */

import { 
    SuggestOperatorInput, 
    SuggestOperatorInputSchema, 
    SuggestOperatorOutput, 
    SuggestOperatorOutputSchema 
} from '@/lib/types';
import { assignOperator } from '@/lib/business-logic';
import { determineTransmission } from '@/lib/event-logic';
import { ai } from '@/ai/genkit';

// By default, we use business logic. The AI flow is preserved but not used.
export async function suggestOperator(input: SuggestOperatorInput): Promise<SuggestOperatorOutput> {
    const eventDate = new Date(input.date);
    const location = input.location;

    // 1. Determine transmission type based on location
    const transmission = determineTransmission(location);

    // 2. Assign operator based on date and location using existing business logic
    const operator = await assignOperator(eventDate, location);

    // 3. Construct and return the output
    return {
        operator,
        transmission,
    };
}

// The AI-driven flow is defined below but not exported by default.
// To use it, you would change the export above to point to this flow.
const suggestOperatorFlow = ai.defineFlow(
    {
        name: 'suggestOperatorFlow',
        inputSchema: SuggestOperatorInputSchema,
        outputSchema: SuggestOperatorOutputSchema,
    },
    async (input) => {
        // This is where AI logic would be implemented.
        // For now, it mirrors the business logic for consistency.
        const eventDate = new Date(input.date);
        const operator = await assignOperator(eventDate, input.location);
        const transmission = determineTransmission(input.location);

        return { operator, transmission };
    }
);
