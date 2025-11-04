
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
    Event,
    Personnel
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
    // Add date to the input schema for the tool
    input: {schema: SuggestTeamInputSchema.extend({
        personnel: z.any(), // The full list of personnel is passed in.
    })},
    output: { schema: SuggestTeamOutputSchema },
    // System message to guide the AI's behavior
    system: `You are an expert production manager for a legislative TV station. Your task is to assemble the best possible team for a given event based on the event's details and the daily schedule.

Your primary goals are:
1.  **Avoid Double-Booking:** Use the \`getSchedule\` tool to check which team members are already assigned to other events on the specified 'date'. Pass the 'date' field from the input to this tool.
2.  **Match Skills to Needs:** Assign a "transmissionOperator", "cinematographicReporter", "reporter", and "producer" as needed based on the event's transmission types.
3.  **Provide a Complete Team:** Try to fill all roles, but it's okay to leave a role empty if no one suitable is available.
4.  **Use Only Provided Personnel:** You can only assign personnel from the list provided in the prompt. Do not invent names.

You will receive the event details and a list of all available personnel. Use this information and the \`getSchedule\` tool to make your decision and return the structured team.`,
    // Use handlebars to structure the input for the AI
    prompt: `
        Event Details:
        - Name: {{{name}}}
        - Location: {{{location}}}
        - Date: {{{date}}}
        - Time: {{{time}}}
        - Transmission Types: {{#each transmissionTypes}}{{{this}}}{{/each}}

        Available Personnel:
        {{#each personnel}}
        - Name: {{{this.name}}}, Role: {{{this.role}}}
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
            // 2. Combine all personnel into a single list with roles for the prompt
            const allPersonnelWithRoles = [
                ...(input.operators || []).map(p => ({...p, role: 'transmissionOperator'})),
                ...(input.cinematographicReporters || []).map(p => ({...p, role: 'cinematographicReporter'})),
                ...(input.reporters || []).map(p => ({...p, role: 'reporter'})),
                ...(input.producers || []).map(p => ({...p, role: 'producer'}))
            ];

            // 3. Call the AI prompt with the necessary context, including the personnel and the date for the tool
            const { output } = await suggestTeamPrompt({
                ...input,
                date: format(eventDate, 'yyyy-MM-dd'), // Format date for the tool
                personnel: allPersonnelWithRoles,
            });

            // 4. Return the structured output from the AI
            return output || {};

        } else {
            // --- LOGIC MODE ---
            // Data fetching is now done on the client. We just call the logic function.
            const result = await suggestTeamWithLogic({
                ...input,
                eventsToday: input.eventsToday!,
                allFutureEvents: input.allFutureEvents!,
            });
            
            return result;
        }
    }
);
