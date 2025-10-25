'use server';
/**
 * @fileOverview A flow for suggesting an event team.
 * - suggestTeamFlow - A function that suggests a team based on event details.
 */

import { ai } from '@/ai/genkit';
import { suggestTeam } from '@/lib/suggestion-logic';
import { SuggestTeamInput, SuggestTeamInputSchema, SuggestTeamOutput, SuggestTeamOutputSchema } from '@/lib/types';

// Exported wrapper function
export async function suggestTeamFlow(input: SuggestTeamInput): Promise<SuggestTeamOutput> {
    return suggestTeam(input);
}

// Define the flow
const flow = ai.defineFlow(
    {
        name: 'suggestTeamFlow',
        inputSchema: SuggestTeamInputSchema,
        outputSchema: SuggestTeamOutputSchema,
    },
    async (input) => {
        // The core logic is in `suggestTeam`, so we just call it.
        // This flow acts as a server-side, authenticated wrapper.
        return await suggestTeam(input);
    }
);
