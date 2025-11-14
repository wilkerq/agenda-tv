
'use server';
/**
 * @fileOverview A flow to automatically send the next day's agenda to all operators.
 *
 * - sendDailyAgendaToAll - Fetches operators and their schedules, then sends a WhatsApp message.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generateWhatsAppMessage } from './generate-whatsapp-message-flow';
import { addDays, startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Event } from '@/lib/types';
import { logAction } from '@/lib/audit-log';
// Admin SDK is no longer used for direct DB access in flows
import { collection, getDocs, query, where, Timestamp, Firestore } from 'firebase/firestore';


// This type can be used if we need to pass a DB instance to the flow in the future.
// For now, we get it from an internal source that has access to the client SDK.
interface FlowInput {
    db: Firestore;
    adminUserEmail: string;
}

const SendDailyAgendaOutputSchema = z.object({
  success: z.boolean(),
  messagesSent: z.number(),
  errors: z.array(z.string()),
});
type SendDailyAgendaOutput = z.infer<typeof SendDailyAgendaOutputSchema>;

// The input for this flow now requires the Firestore instance and the user email for logging.
const SendDailyAgendaInputSchema = z.object({
    db: z.any().describe("The Firestore client instance."),
    adminUserEmail: z.string().describe("The email of the user triggering the action for audit purposes."),
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
  async ({ db, adminUserEmail }) => {
    // 1. Fetch all personnel from all relevant collections using the client SDK
    const personnelCollections = ['transmission_operators', 'cinematographic_reporters', 'production_personnel'];
    const allPersonnel: { name: string, phone?: string }[] = [];
    
    for (const coll of personnelCollections) {
        const personnelCollectionRef = collection(db, coll);
        try {
            const personnelSnapshot = await getDocs(personnelCollectionRef);
            personnelSnapshot.forEach(doc => {
                const data = doc.data();
                // Ensure no duplicates by name
                if (data.name && !allPersonnel.some(p => p.name === data.name)) {
                     allPersonnel.push({ name: data.name, phone: data.phone });
                }
            });
        } catch (serverError) {
             console.error(`Error fetching personnel from ${coll}`, serverError);
             throw serverError; // Let the caller handle it
        }
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

    const eventsCollectionRef = collection(db, "events");
    
    const fieldsToQuery = ["transmissionOperator", "cinematographicReporter", "reporter", "producer"];
    const allEventsForTomorrow: Event[] = [];
    const eventIds = new Set<string>();

    try {
      for (const field of fieldsToQuery) {
          if (personnelNames.length > 0) {
            const eventsQuery = query(
                eventsCollectionRef,
                where("date", ">=", Timestamp.fromDate(startOfTomorrow)),
                where("date", "<=", Timestamp.fromDate(endOfTomorrow)),
                where(field, "in", personnelNames)
            );
            
            const eventsSnapshot = await getDocs(eventsQuery);
            eventsSnapshot.docs.forEach(doc => {
                if (!eventIds.has(doc.id)) {
                    eventIds.add(doc.id);
                    const data = doc.data();
                    allEventsForTomorrow.push({
                        id: doc.id,
                        ...data,
                        date: (data.date as Timestamp).toDate(),
                    } as Event);
                }
            });
          }
      }
      
      allEventsForTomorrow.sort((a,b) => a.date.getTime() - b.date.getTime());

      // 3. Group events by personnel
      allEventsForTomorrow.forEach(event => {
          const involvedPersonnel = new Set([
              event.transmissionOperator,
              event.cinematographicReporter,
              event.reporter,
              event.producer,
          ]);

          involvedPersonnel.forEach(personName => {
              if (personName && personnelNames.includes(personName)) {
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
    } catch (serverError) {
        console.error("Error fetching tomorrow's events", serverError);
        throw serverError; // Let the caller handle
    }


    // 4. Send messages to each person with events
    const personnelToSend = Object.keys(personnelWithEvents);
    for (const personName of personnelToSend) {
      const data = personnelWithEvents[personName];
      if (!data.phone) {
        errors.push(`${personName} (sem telefone)`);
        continue; // Skip if person has no phone number
      }

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
        errors.push(personName);
      }
    }

    // 5. Log the result of the automatic execution
    const logDetails = {
        messagesSent,
        errors,
        targetDate: format(tomorrow, 'yyyy-MM-dd'),
    };

    await logAction({
        action: 'automatic-send',
        collectionName: 'system',
        documentId: `send-agenda-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}`,
        userEmail: adminUserEmail, // Use the provided user email
        details: logDetails
    });


    return {
      success: errors.length === 0,
      messagesSent,
      errors,
    };
  }
);
