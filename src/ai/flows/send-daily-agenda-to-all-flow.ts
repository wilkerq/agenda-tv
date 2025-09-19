
'use server';
/**
 * @fileOverview A flow to automatically send the next day's agenda to all operators.
 *
 * - sendDailyAgendaToAll - Fetches operators and their schedules, then sends a WhatsApp message.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateWhatsAppMessage } from './generate-whatsapp-message-flow';
import { addDays, startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SendDailyAgendaOutputSchema = z.object({
  success: z.boolean(),
  messagesSent: z.number(),
  errors: z.array(z.string()),
});
type SendDailyAgendaOutput = z.infer<typeof SendDailyAgendaOutputSchema>;

export async function sendDailyAgendaToAll(): Promise<SendDailyAgendaOutput> {
  return sendDailyAgendaToAllFlow();
}

const sendDailyAgendaToAllFlow = ai.defineFlow(
  {
    name: 'sendDailyAgendaToAllFlow',
    outputSchema: SendDailyAgendaOutputSchema,
  },
  async () => {
    const operatorsCollection = collection(db, 'operators');
    const operatorsSnapshot = await getDocs(operatorsCollection);
    const operators = operatorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string, name: string, phone: string }));

    const tomorrow = addDays(new Date(), 1);
    const startOfTomorrow = startOfDay(tomorrow);
    const endOfTomorrow = endOfDay(tomorrow);

    let messagesSent = 0;
    const errors: string[] = [];

    for (const operator of operators) {
      try {
        const eventsQuery = query(
          collection(db, "events"),
          where("operator", "==", operator.name),
          where("date", ">=", Timestamp.fromDate(startOfTomorrow)),
          where("date", "<=", Timestamp.fromDate(endOfTomorrow)),
          orderBy("date", "asc")
        );

        const eventsSnapshot = await getDocs(eventsQuery);
        const operatorEvents = eventsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                date: (data.date as Timestamp).toDate(),
            };
        });

        if (operatorEvents.length > 0) {
          const eventStrings = operatorEvents.map(e => `- ${format(e.date, "HH:mm")}h: ${e.name} (${e.location})`);
          
          await generateWhatsAppMessage({
            operatorName: operator.name,
            scheduleDate: format(tomorrow, "PPPP", { locale: ptBR }),
            events: eventStrings,
            operatorPhone: operator.phone.replace('+', ''),
          });
          messagesSent++;
        }
      } catch (error) {
        console.error(`Failed to send agenda to ${operator.name}:`, error);
        errors.push(operator.name);
      }
    }

    return {
      success: errors.length === 0,
      messagesSent,
      errors,
    };
  }
);
