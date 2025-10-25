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
    // This flow now directly calls the server-side business logic.
    // This ensures it runs with proper server credentials if needed,
    // and keeps the core logic separate from the AI flow definition.
    return suggestTeam(input);
}
