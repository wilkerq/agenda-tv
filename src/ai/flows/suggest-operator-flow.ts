
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
import { suggestTeam } from '@/lib/suggestion-logic';
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
        const team = await suggestTeam({
            date: input.date,
            location: input.location,
            transmissionTypes: [] // This flow is now a wrapper, the main logic is in `suggestTeam`
        });

        // The old flow returns only operator and transmission, so we adapt the new output
        return { 
            transmissionOperator: team.transmissionOperator, 
            transmission: team.transmission
        };
    }
);

    
