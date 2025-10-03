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
import { googleAI } from '@/ai/genkit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Exported wrapper function
export async function generateDailyAgenda(input: DailyAgendaInput): Promise<DailyAgendaOutput> {
    // --- AI Call Disabled - Using Simple String Formatting ---
    const header = `*PAUTA DO DIA* 🎬\n\n*${input.scheduleDate}*\n\n`;
    const eventList = input.events.join('\n');
    const message = header + eventList;
    
    return { message };
}

// Flow Definition (kept for potential future re-activation)
const generateDailyAgendaFlow = ai.defineFlow(
  {
    name: 'generateDailyAgendaFlow',
    inputSchema: DailyAgendaInputSchema,
    outputSchema: DailyAgendaOutputSchema,
  },
  async (input) => {
    
    // --- Using simple string formatting instead of AI ---
    const header = `*PAUTA DO DIA* 🎬\n\n*${input.scheduleDate}*\n\n`;
    const eventList = input.events.join('\n');
    const message = header + eventList;

    return { message };
  }
);
