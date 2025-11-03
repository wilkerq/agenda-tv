
'use server';
/**
 * @fileOverview A flow for generating a daily agenda WhatsApp message using AI.
 *
 * - generateDailyAgenda - A function that creates a message from a list of events for a specific day.
 */
import { 
    DailyAgendaInput,
    DailyAgendaInputSchema,
    DailyAgendaOutput,
    DailyAgendaOutputSchema,
} from '@/lib/types';
import { ai } from '@/ai/genkit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getOperationMode } from '@/lib/state';

// Exported wrapper function
export async function generateDailyAgenda(input: DailyAgendaInput): Promise<DailyAgendaOutput> {
    return generateDailyAgendaFlow(input);
}

const dailyAgendaPrompt = ai.definePrompt({
    name: 'generateDailyAgendaPrompt',
    model: 'googleai/gemini-pro',
    input: { schema: DailyAgendaInputSchema },
    output: { schema: DailyAgendaOutputSchema },
    prompt: `You are a helpful assistant for a TV station's production team. Your task is to generate a clear, organized, and friendly daily agenda message in Brazilian Portuguese.

    The message should be formatted for easy readability on WhatsApp. Use bold for headers.

    - Start with the header "*PAUTA DO DIA* 🎬".
    - Add the full, formatted date provided in 'scheduleDate'.
    - List all the events provided in the 'events' array.
    - Each event should be a bullet point.
    
    Example:
    *PAUTA DO DIA* 🎬

    *terça-feira, 13 de agosto de 2024*

    • - Op: João da Silva / Rep. Cine: Maria Souza - Evento de Teste (Plenário Iris Rezende Machado)
    • - Op: Carlos Pereira - Outro Evento (Auditório Francisco Gedda)

    ---
    Date for the agenda: {{{scheduleDate}}}
    Events:
    {{#each events}}
    - {{{this}}}
    {{/each}}
    `
});

const generateDailyAgendaFlow = ai.defineFlow(
  {
    name: 'generateDailyAgendaFlow',
    inputSchema: DailyAgendaInputSchema,
    outputSchema: DailyAgendaOutputSchema,
  },
  async (input) => {
    const mode = await getOperationMode();
    const formattedDate = format(new Date(input.scheduleDate), "PPPP", { locale: ptBR });
    
    if (mode === 'ai') {
        const { output } = await dailyAgendaPrompt({
            ...input,
            scheduleDate: formattedDate, // Pass the formatted date to the prompt
        });
        return output!;

    } else {
        // --- LOGIC MODE ---
        const header = `*PAUTA DO DIA* 🎬\n\n*${formattedDate}*\n\n`;
        const eventList = input.events.map(e => `• ${e}`).join('\n');
        const message = header + eventList;
        
        return { message };
    }
  }
);
