
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
import { assignTransmissionOperator } from '@/lib/business-logic';
import { determineTransmission } from '@/lib/event-logic';
import { ai } from '@/ai/genkit';

// By default, we use business logic. The AI flow is preserved but can be used for more complex scenarios.
export async function suggestOperator(input: SuggestOperatorInput): Promise<SuggestOperatorOutput> {
    return suggestOperatorFlow(input);
}

// The AI-driven flow is defined below.
const suggestOperatorFlow = ai.defineFlow(
    {
        name: 'suggestOperatorFlow',
        inputSchema: SuggestOperatorInputSchema,
        outputSchema: SuggestOperatorOutputSchema,
    },
    async (input) => {
        // For this task, we will rely on deterministic business logic instead of a generative AI call.
        // This ensures consistency and predictability. The Genkit flow structure is maintained 
        // to allow for future enhancements with AI if needed.
        
        const eventDate = new Date(input.date);
        
        // 1. Assign operator based on date and location using existing business logic
        const operator = await assignTransmissionOperator(eventDate, input.location);

        // 2. Determine transmission type based on location
        const transmission = determineTransmission(input.location);

        // 3. Construct and return the output
        return { 
            transmissionOperator: operator, 
            transmission 
        };
    }
);
