
'use server';
/**
 * @fileOverview A flow for suggesting an event team.
 * - suggestTeam - A function that suggests a team based on event details.
 */

import { ai } from '@/ai/genkit';
import { suggestTeam as suggestTeamLogic } from '@/lib/suggestion-logic';
import { SuggestTeamInput, SuggestTeamInputSchema, SuggestTeamOutput, SuggestTeamOutputSchema } from '@/lib/types';


export const suggestTeamFlow = ai.defineFlow(
    {
        name: 'suggestTeamFlow',
        inputSchema: SuggestTeamInputSchema,
        outputSchema: SuggestTeamOutputSchema,
    },
    async (input) => {
        // This flow now directly calls the server-side business logic.
        // This ensures it runs with proper server credentials if needed,
        // and keeps the core logic separate from the AI flow definition.
        const result = await suggestTeamLogic(input);
        return result as SuggestTeamOutput;
    }
);
