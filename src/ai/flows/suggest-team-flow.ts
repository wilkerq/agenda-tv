
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
    SuggestTeamOutputSchema 
} from '@/lib/types';
import { getScheduleTool } from '../tools/get-schedule-tool';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin'; // Use o Admin DB no servidor
import { format, parseISO } from 'date-fns';

// Helper to fetch all available personnel from all collections using Admin SDK
const fetchAllPersonnel = async () => {
    const db = getAdminDb();
    const collections = ['transmission_operators', 'cinematographic_reporters', 'production_personnel'];
    const personnel: { id: string, name: string, role: string }[] = [];
    for (const coll of collections) {
        const snapshot = await db.collection(coll).get();
        snapshot.forEach(doc => {
            const data = doc.data();
            let role = coll.replace(/s$/, ''); // basic singularization
            if (coll === 'production_personnel') {
                if (data.isReporter) personnel.push({ id: doc.id, name: data.name, role: 'reporter' });
                if (data.isProducer) personnel.push({ id: doc.id, name: data.name, role: 'producer' });
            } else {
                 personnel.push({ id: doc.id, name: data.name, role: role });
            }
        });
    }
    return personnel;
};

// Main exported function
export async function suggestTeam(input: SuggestTeamInput): Promise<SuggestTeamOutput> {
    return suggestTeamFlow(input);
}


// Define the prompt for the AI
const suggestTeamPrompt = ai.definePrompt({
    name: 'suggestTeamPrompt',
    // Ensure the model is suitable for complex reasoning and tool use
    model: 'googleai/gemini-1.5-pro-latest', 
    // Available tools for the AI
    tools: [getScheduleTool],
    // Add date to the input schema for the tool
    inputSchema: SuggestTeamInputSchema.extend({
        personnel: z.any(), // Add personnel to the schema
    }),
    outputSchema: SuggestTeamOutputSchema,
    // System message to guide the AI's behavior
    system: `You are an expert production manager for a legislative TV station. Your task is to assemble the best possible team for a given event based on the event's details and the daily schedule.

Your primary goals are:
1.  **Avoid Double-Booking:** Use the \`getSchedule\` tool to check which team members are already assigned to other events on the specified 'date'. Pass the 'date' field from the input to this tool.
2.  **Match Skills to Needs:** Assign a "transmissionOperator", "cinematographicReporter", "reporter", and "producer" as needed based on the event's transmission types.
3.  **Provide a Complete Team:** Try to fill all roles, but it's okay to leave a role empty if no one suitable is available.
4.  **Use Only Provided Personnel:** You can only assign personnel from the list provided in the prompt. Do not invent names.

You will receive the event details and a list of all available personnel. Use this information and the \`getSchedule\` tool to make your decision and return the suggested team.`,
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
        // 1. Fetch all available personnel
        const allPersonnel = await fetchAllPersonnel();
        
        // 2. Extract date and time from the input
        const eventDate = parseISO(input.date);

        // 3. Call the AI prompt with the necessary context, including the personnel and the date for the tool
        const { output } = await suggestTeamPrompt({
            ...input,
            date: format(eventDate, 'yyyy-MM-dd'), // Format date for the tool
            personnel: allPersonnel,
        });

        // 4. Return the structured output from the AI
        return output || {};
    }
);
