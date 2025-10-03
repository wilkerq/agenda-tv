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


export async function suggestOperator(input: SuggestOperatorInput): Promise<SuggestOperatorOutput> {
    // --- AI Call Disabled - Using Business Logic Directly ---
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

// The original AI flow is preserved below but is currently not used by the exported function.
const suggestOperatorFlow = ai.defineFlow(
    {
        name: 'suggestOperatorFlow',
        inputSchema: SuggestOperatorInputSchema,
        outputSchema: SuggestOperatorOutputSchema,
    },
    async (input) => {
        // AI logic would go here. For now, we use the direct business logic above.
        const eventDate = new Date(input.date);
        const operator = await assignOperator(eventDate, input.location);
        const transmission = determineTransmission(input.location);

        return { operator, transmission };
    }
);
