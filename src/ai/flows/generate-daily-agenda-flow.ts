
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

// Exported wrapper function
export async function generateDailyAgenda(input: DailyAgendaInput): Promise<DailyAgendaOutput> {
    return generateDailyAgendaFlow(input);
}

const generateDailyAgendaFlow = ai.defineFlow(
  {
    name: 'generateDailyAgendaFlow',
    inputSchema: DailyAgendaInputSchema,
    outputSchema: DailyAgendaOutputSchema,
  },
  async (input) => {
    // Using simple string formatting as AI is disabled for this flow
    const formattedDate = format(new Date(input.scheduleDate), "PPPP", { locale: ptBR });
    const header = `*PAUTA DO DIA* 🎬\n\n*${formattedDate}*\n\n`;
    const eventList = input.events.map(e => `• ${e}`).join('\n');
    const message = header + eventList;
    
    return { message };
  }
);
