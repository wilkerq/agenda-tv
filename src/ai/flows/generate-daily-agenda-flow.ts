'use server';
/**
 * @fileOverview A flow for generating a daily agenda WhatsApp message.
 *
 * - generateDailyAgenda - A function that creates a message from a list of events for a specific day.
 */
import { 
    DailyAgendaInput,
    DailyAgendaOutput,
} from '@/lib/types';

// This function no longer needs to be a Genkit flow, as it's just string formatting.
export async function generateDailyAgenda(input: DailyAgendaInput): Promise<DailyAgendaOutput> {
  const { scheduleDate, events } = input;

  // Format the event list
  const eventList = events.join('\n');

  // Construct the message using a template literal
  const message = `*PAUTA DO DIA* 🎬

*${scheduleDate}*

${eventList}
`;

  return { message };
}
