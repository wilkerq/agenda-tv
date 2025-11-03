'use server';
/**
 * @fileOverview A flow to automatically send the next day's agenda to all operators.
 *
 * - sendDailyAgendaToAll - Fetches operators and their schedules, then sends a WhatsApp message.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { generateWhatsAppMessage } from './generate-whatsapp-message-flow';
import { addDays, startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Event } from '@/lib/types';
import { logAction } from '@/lib/audit-log';

const serviceAccount = {
  "type": "service_account",
  "project_id": "agenda-news-room-4491522-e400a",
  "private_key_id": "6d36a8585e50522b64a275466804d9c73336d3c0",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZg8eG48a7b94j\n4YJt4P9p7bH3EwYI4I/d5b5a4g6K5e6E8F6n6v6H5G4D3C2B1A0/9F8H7J6K4I5h\n4G3E2D1B0A9g8c7b6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a2b1a0/8f7e6d5c4b3a298h\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-7k1q1@agenda-news-room-4491522-e400a.iam.gserviceaccount.com",
  "client_id": "108518939417235213251",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-7k1q1%40agenda-news-room-4491522-e400a.iam.gserviceaccount.com"
};

let adminApp: App;
function initializeAdminApp() {
    if (!getApps().length) {
        adminApp = initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        adminApp = getApps()[0]!;
    }
}
initializeAdminApp();
const adminDb = getFirestore(adminApp);


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
    if (!adminDb) {
        throw new Error("Admin DB not initialized");
    }
    
    // 1. Fetch all personnel from all relevant collections
    const personnelCollections = ['transmission_operators', 'cinematographic_reporters', 'production_personnel'];
    const allPersonnel: { name: string, phone?: string }[] = [];
    
    for (const coll of personnelCollections) {
        const personnelCollectionRef = adminDb.collection(coll);
        try {
            const personnelSnapshot = await personnelCollectionRef.get();
            personnelSnapshot.forEach(doc => {
                const data = doc.data();
                // Ensure no duplicates by name
                if (data.name && !allPersonnel.some(p => p.name === data.name)) {
                     allPersonnel.push({ name: data.name, phone: data.phone });
                }
            });
        } catch (serverError) {
             console.error(`Error fetching personnel from ${coll}`, serverError);
             throw serverError;
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

    const eventsCollectionRef = adminDb.collection("events");
    
    // Firestore Admin SDK does not support 'or' queries directly in this manner.
    // We will fetch for each field and merge.
    const fieldsToQuery = ["transmissionOperator", "cinematographicReporter", "reporter", "producer"];
    const allEventsForTomorrow: Event[] = [];
    const eventIds = new Set<string>();

    try {
      for (const field of fieldsToQuery) {
          const eventsQuery = eventsCollectionRef
              .where("date", ">=", Timestamp.fromDate(startOfTomorrow))
              .where("date", "<=", Timestamp.fromDate(endOfTomorrow))
              .where(field, "in", personnelNames);
              
          const eventsSnapshot = await eventsQuery.get();
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
        throw serverError;
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
        userEmail: 'System Automation (n8n)',
        details: logDetails
    });


    return {
      success: errors.length === 0,
      messagesSent,
      errors,
    };
  }
);
