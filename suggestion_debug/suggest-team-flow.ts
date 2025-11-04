
'use server';
/**
 * @fileOverview A flow for suggesting an event team using AI.
 * - suggestTeam - A function that suggests a team based on event details.
 */
import { ai } from '@/ai/genkit';
import { 
    SuggestTeamInput, 
    SuggestTeamInputSchema, 
    SuggestTeamOutput, 
    SuggestTeamOutputSchema,
} from '@/lib/types';
import { getScheduleTool } from '../tools/get-schedule-tool';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { getOperationMode } from '@/lib/state';
import { suggestTeam as suggestTeamWithLogic } from '@/lib/suggestion-logic';


// Main exported function
export async function suggestTeam(input: SuggestTeamInput): Promise<SuggestTeamOutput> {
    return suggestTeamFlow(input);
}


// Define the prompt for the AI
const suggestTeamPrompt = ai.definePrompt({
    name: 'suggestTeamPrompt',
    // Ensure the model is suitable for complex reasoning and tool use
    model: 'googleai/gemini-1.5-pro', 
    // Available tools for the AI
    tools: [getScheduleTool],
    // The input now expects separate, clearly-defined lists for each role.
    input: {schema: SuggestTeamInputSchema},
    output: { schema: SuggestTeamOutputSchema },
    // System message to guide the AI's behavior
    system: `You are an expert production manager for a legislative TV station. Your task is to assemble the best possible team for a given event.

Your primary goals are:
1.  **Avoid Double-Booking:** Use the \`getSchedule\` tool to check which team members are already assigned to other events on the specified 'date'. Pass the 'date' field from the input to this tool.
2.  **Match Skills to Needs:** Assign a "transmissionOperator", "cinematographicReporter", "reporter", and "producer" as needed.
3.  **Use Only Provided Personnel:** You can only assign personnel from the specific lists provided (operators, cinematographicReporters, reporters, producers). Do not invent names or mix roles.
4.  **Provide a Complete Team:** Try to fill all roles, but it's okay to leave a role empty if no one suitable is available.

You will receive the event details and lists of available personnel for each role. Use this information and the \`getSchedule\` tool to make your decision and return the structured team.`,
    // Use handlebars to structure the input for the AI, now with separate loops for each role
    prompt: `
        Event Details:
        - Name: {{{name}}}
        - Location: {{{location}}}
        - Date: {{{date}}}
        - Time: {{{time}}}
        - Transmission Types: {{#each transmissionTypes}}{{{this}}}{{/each}}

        Available Personnel:
        
        Operators:
        {{#each operators}}
        - {{{this.name}}} (Turno: {{{this.turn}}})
        {{else}}
        - None available
        {{/each}}

        Cinematographic Reporters:
        {{#each cinematographicReporters}}
        - {{{this.name}}} (Turno: {{{this.turn}}})
        {{else}}
        - None available
        {{/each}}

        Reporters:
        {{#each reporters}}
        - {{{this.name}}} (Turno: {{{this.turn}}})
        {{else}}
        - None available
        {{/each}}

        Producers:
        {{#each producers}}
        - {{{this.name}}} (Turno: {{{this.turn}}})
        {{else}}
        - None available
        {{/each}}
    `,
});


// Define the main Genkit flow
const suggestTeamFlow = ai.defineFlow(
    {
        name: 'suggestTeamFlow',
        inputSchema: SuggestTeamInputSchema,
        outputSchema: SuggestTeamOutputSchema,
    },
    async (input) => {
        const mode = await getOperationMode();
        const eventDate = parseISO(input.date);

        if (mode === 'ai') {
            // --- AI MODE ---
            // The input 'input' already contains the separated lists (reporters, producers, etc.)
            // as defined in the updated SuggestTeamInputSchema. We just need to call the prompt.
            const { output } = await suggestTeamPrompt({
                ...input,
                date: format(eventDate, 'yyyy-MM-dd'), // Format date for the tool
            });

            // Return the structured output from the AI
            return output || {};

        } else {
            // --- LOGIC MODE ---
            // Data fetching is now done on the client. We just call the logic function.
            const result = await suggestTeamWithLogic({
                ...input,
                // The input already contains all necessary fields, including eventsToday and allFutureEvents
            });
            
            return result;
        }
    }
);
