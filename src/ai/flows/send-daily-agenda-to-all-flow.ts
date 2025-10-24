
'use server';
/**
 * @fileOverview A flow to automatically send the next day's agenda to all operators.
 *
 * - sendDailyAgendaToAll - Fetches operators and their schedules, then sends a WhatsApp message.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, query, where, Timestamp, orderBy, addDoc, or, and } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateWhatsAppMessage } from './generate-whatsapp-message-flow';
import { addDays, startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Event, Operator } from '@/lib/types';


const SendDailyAgendaOutputSchema = z.object({
  success: z.boolean(),
  messagesSent: z.number(),
  errors: z.array(z.string()),
});
type SendDailyAgendaOutput = z.infer<typeof SendDailyAgendaOutputSchema>;

const SendDailyAgendaInputSchema = z.object({
    // This flow doesn't require any specific input from the client anymore
});
type SendDailyAgendaInput = z.infer<typeof SendDailyAgendaInputSchema>;


export async function sendDailyAgendaToAll(input: SendDailyAgendaInput): Promise<SendDailyAgendaOutput> {
  return sendDailyAgendaToAllFlow(input);
}

const sendDailyAgendaToAllFlow = ai.defineFlow(
  {
    name: 'sendDailyAgendaToAllFlow',
    inputSchema: SendDailyAgendaInputSchema,
    outputSchema: SendDailyAgendaOutputSchema,
  },
  async (input) => {
    // 1. Fetch all personnel from all relevant collections
    const personnelCollections = ['transmission_operators', 'cinematographic_reporters', 'production_personnel'];
    const allPersonnel: { name: string, phone?: string }[] = [];
    
    for (const coll of personnelCollections) {
        const personnelSnapshot = await getDocs(collection(db, coll));
        personnelSnapshot.forEach(doc => {
            const data = doc.data();
            // Ensure no duplicates by name
            if (data.name && !allPersonnel.some(p => p.name === data.name)) {
                 allPersonnel.push({ name: data.name, phone: data.phone });
            }
        });
    }

    const tomorrow = addDays(new Date(), 1);
    const startOfTomorrow = startOfDay(tomorrow);
    const endOfTomorrow = endOfDay(tomorrow);

    let messagesSent = 0;
    const errors: string[] = [];
    const personnelWithEvents: { [key: string]: { phone?: string, events: Event[] } } = {};
    
    // 2. Find all events for tomorrow for any person
    const personnelNames = allPersonnel.map(p => p.name);
    if(personnelNames.length === 0) {
      return { success: true, messagesSent: 0, errors: [] };
    }

    const eventsQuery = query(
        collection(db, "events"),
        and(
            where("date", ">=", Timestamp.fromDate(startOfTomorrow)),
            where("date", "<=", Timestamp.fromDate(endOfTomorrow)),
            or(
                where("transmissionOperator", "in", personnelNames),
                where("cinematographicReporter", "in", personnelNames),
                where("reporter", "in", personnelNames),
                where("producer", "in", personnelNames)
            )
        ),
        orderBy("date", "asc")
    );

    const eventsSnapshot = await getDocs(eventsQuery);

    // 3. Group events by personnel
    eventsSnapshot.docs.forEach(doc => {
        const event = {
            id: doc.id,
            ...doc.data(),
            date: (doc.data().date as Timestamp).toDate(),
        } as Event;

        const involvedPersonnel = new Set([
            event.transmissionOperator,
            event.cinematographicReporter,
            event.reporter,
            event.producer,
        ]);

        involvedPersonnel.forEach(personName => {
            if (personName) {
                if (!personnelWithEvents[personName]) {
                    personnelWithEvents[personName] = { 
                        phone: allPersonnel.find(p => p.name === personName)?.phone,
                        events: [] 
                    };
                }
                personnelWithEvents[personName].events.push(event);
            }
        });
    });

    // 4. Send messages to each person with events
    const personnelToSend = Object.keys(personnelWithEvents);
    for (const personName of personnelToSend) {
      const data = personnelWithEvents[personName];
      if (!data.phone) continue; // Skip if person has no phone number

      try {
        const eventStrings = data.events.map(e => `- ${format(e.date, "HH:mm")}h: ${e.name} (${e.location})`);
        
        await generateWhatsAppMessage({
          operatorName: personName,
          scheduleDate: format(tomorrow, "PPPP", { locale: ptBR }),
          events: eventStrings,
          operatorPhone: data.phone.replace(/\D/g, ''),
        });
        messagesSent++;
        
        // Wait for 30 seconds before sending the next message
        if (personnelToSend.indexOf(personName) < personnelToSend.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 30000));
        }

      } catch (error) {
        console.error(`Failed to send agenda to ${personName}:`, error);
        errors.push(personName);
      }
    }

    // 5. Log the result of the automatic execution
    await addDoc(collection(db, 'audit_logs'), {
      action: 'automatic-send',
      collectionName: 'system',
      documentId: `send-agenda-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}`,
      userEmail: 'System Automation (n8n)',
      timestamp: Timestamp.now(),
      details: {
        messagesSent,
        errors,
        targetDate: format(tomorrow, 'yyyy-MM-dd'),
      },
    });


    return {
      success: errors.length === 0,
      messagesSent,
      errors,
    };
  }
);
