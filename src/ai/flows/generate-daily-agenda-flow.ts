
'use server';
/**
 * @fileOverview A flow for generating a daily agenda WhatsApp message using AI.
 *
 * - generateDailyAgenda - A function that creates a message from a list of events for a specific day.
 */
import { 
    DailyAgendaOutput,
    DailyAgendaOutputSchema,
    EventForAgendaSchema,
} from '@/lib/types';
import { ai } from '@/ai/genkit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';


// Add the operation mode to the input schema
const DailyAgendaFlowInputSchema = z.object({
    scheduleDate: z.string(),
    events: z.union([z.array(EventForAgendaSchema), z.array(z.string())]),
    mode: z.enum(['ai', 'logic']),
});
type DailyAgendaFlowInput = z.infer<typeof DailyAgendaFlowInputSchema>;


// Exported wrapper function
export async function generateDailyAgenda(input: DailyAgendaFlowInput): Promise<DailyAgendaOutput> {
    return generateDailyAgendaFlow(input);
}

const dailyAgendaPrompt = ai.definePrompt({
    name: 'generateDailyAgendaPrompt',
    model: 'ollama/llama3:latest',
    input: { schema: z.object({ scheduleDate: z.string(), events: z.array(EventForAgendaSchema) }) },
    output: { schema: DailyAgendaOutputSchema },
    prompt: `You are an expert production assistant for a TV station. Your task is to generate a clear, organized, and friendly daily agenda message in Brazilian Portuguese, formatted for WhatsApp.

    - The header must be "*PAUTA DO DIA* 🎬".
    - Include the full date provided in 'scheduleDate'.
    - For each event in the 'events' JSON array, you must list:
        - The event time.
        - The event name and its location in parentheses.
        - On a new line, indented, list ALL staff involved, using labels like "Op:", "Rep. Cine:", "Repórter:", and "Prod:". Group them under an "Equipe:" label.

    Here is a perfect example of the output format:
    *PAUTA DO DIA* 🎬

    *terça-feira, 13 de agosto de 2024*

    • *09:00h* - Evento de Teste (Plenário Iris Rezende Machado)
      - Equipe: Op: João da Silva / Rep. Cine: Maria Souza
    
    • *14:00h* - Outro Evento (Auditório Francisco Gedda)
      - Equipe: Op: Carlos Pereira / Repórter: Ana Costa

    ---
    Agenda Date: {{{scheduleDate}}}
    Events JSON: {{json events}}
    `
});

const generateDailyAgendaFlow = ai.defineFlow(
  {
    name: 'generateDailyAgendaFlow',
    inputSchema: DailyAgendaFlowInputSchema,
    outputSchema: DailyAgendaOutputSchema,
  },
  async (input) => {
    const formattedDate = format(new Date(input.scheduleDate), "PPPP", { locale: ptBR });
    
    if (input.mode === 'ai') {
        const { output } = await dailyAgendaPrompt({
            scheduleDate: formattedDate,
            events: input.events as z.infer<typeof EventForAgendaSchema>[],
        });
        return output!;

    } else {
        // --- LOGIC MODE ---
        const header = `*PAUTA DO DIA* 🎬\n\n*${formattedDate}*\n\n`;
        // When using logic, the events are pre-formatted strings
        const eventList = (input.events as unknown as string[]).map(e => `• ${e}`).join('\n');
        const message = header + eventList;
        
        return { message };
    }
  }
);
