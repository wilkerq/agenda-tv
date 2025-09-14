
'use server';
/**
 * @fileOverview A flow to import events from the official Alego agenda website.
 *
 * - importAlegoAgenda - Fetches, parses, and saves events from the Alego website for the next 15 days.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, writeBatch, getDocs, query, where, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getRandomColor } from '@/lib/utils';
import { parse } from 'node-html-parser';
import { addDays, startOfDay, isValid, format, startOfMonth, endOfMonth, parse as parseDate } from 'date-fns';

const ImportAlegoAgendaOutputSchema = z.object({
  count: z.number().describe('The number of new events imported.'),
});
export type ImportAlegoAgendaOutput = z.infer<typeof ImportAlegoAgendaOutputSchema>;

interface ProcessedEvent {
    name: string;
    date: Date;
    location: string;
    transmission: 'youtube' | 'tv';
    operator: string;
}

// Function to assign operator based on rules
const assignOperator = (date: Date, location: string): string => {
    const hour = date.getHours();

    if (location === 'Sala Julio da Retifica "CCJR"') {
        return "Mário Augusto";
    }

    // Weekday shifts
    if (hour < 12) return "Rodrigo Sousa"; // Morning
    if (hour >= 12 && hour < 18) { // Afternoon
        const operators = ["Ovidio Dias", "Mário Augusto", "Bruno Michel"];
        return operators[Math.floor(Math.random() * operators.length)];
    }
    return "Bruno Michel"; // Night
};

// Function to determine transmission type
const determineTransmission = (eventName: string): 'youtube' | 'tv' => {
    const lowerEventName = eventName.toLowerCase();
    if (lowerEventName.includes("sessão") || lowerEventName.includes("comissão")) {
        return "tv";
    }
    return "youtube";
};

export async function importAlegoAgenda(): Promise<ImportAlegoAgendaOutput> {
  return importAlegoAgendaFlow();
}

const importAlegoAgendaFlow = ai.defineFlow(
  {
    name: 'importAlegoAgendaFlow',
    outputSchema: ImportAlegoAgendaOutputSchema,
  },
  async () => {
    const processedEvents: ProcessedEvent[] = [];
    const today = new Date();

    for (let i = 0; i < 15; i++) {
        const targetDate = addDays(today, i);
        const dateString = format(targetDate, 'dd/MM/yyyy');
        const url = `https://portal.al.go.leg.br/agenda?data=${dateString}`;
        
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                console.warn(`Failed to fetch agenda for ${dateString}: ${response.statusText}`);
                continue;
            }
            const html = await response.text();
            const root = parse(html);

            const eventElements = root.querySelectorAll('.compromisso-item');
            
            // Robust date extraction from the body's data attribute
            const bodyDateStr = root.querySelector('body')?.getAttribute('data-dia-selecionado'); // "YYYY-MM-DD"
            
            if (!bodyDateStr || eventElements.length === 0) {
                continue; // No events or date found for this day
            }
            
            const [year, month, day] = bodyDateStr.split('-').map(Number);
            
            for (const el of eventElements) {
                const timeStr = el.querySelector('.compromisso-horario')?.text.trim(); // "HH:mm"
                const name = el.querySelector('.compromisso-titulo')?.text.trim();
                const location = el.querySelector('.compromisso-local')?.text.trim();
                
                if (!timeStr || !name || !location) {
                    continue; // Skip if essential info is missing
                }
                
                const [hours, minutes] = timeStr.split(':').map(Number);

                if (isNaN(hours) || isNaN(minutes) || isNaN(day) || isNaN(month) || isNaN(year)) {
                    continue; // Skip if date/time parts are invalid
                }
                
                const eventDate = new Date(year, month - 1, day, hours, minutes);

                if (!isValid(eventDate)) {
                    continue;
                }

                processedEvents.push({
                    name,
                    date: eventDate,
                    location,
                    transmission: determineTransmission(name),
                    operator: assignOperator(eventDate, location),
                });
            }

        } catch (error) {
            console.error(`Error fetching or parsing agenda for ${dateString}:`, error);
        }
    }

    if (processedEvents.length === 0) {
        return { count: 0 };
    }

    // Filter out past events
    const validProcessedEvents = processedEvents.filter(event => 
        event.date >= startOfDay(today)
    );

    if (validProcessedEvents.length === 0) {
        return { count: 0 };
    }
    
    const batch = writeBatch(db);
    const eventsCollection = collection(db, "events");
    let newEventsCount = 0;

    // Fetch existing events for the relevant months to avoid duplicates
    const relevantMonths = [...new Set(validProcessedEvents.map(e => format(e.date, 'yyyy-MM')))];
    const existingEventsInDb: { name: string, date: Date }[] = [];

    for (const monthStr of relevantMonths) {
        const monthDate = parseDate(monthStr, 'yyyy-MM', new Date());
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const q = query(
            eventsCollection,
            where('date', '>=', Timestamp.fromDate(start)),
            where('date', '<=', Timestamp.fromDate(end))
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            existingEventsInDb.push({ name: data.name, date: (data.date as Timestamp).toDate() });
        });
    }

    // Compare and add only new events
    for (const event of validProcessedEvents) {
      const isDuplicate = existingEventsInDb.some(
          dbEvent => dbEvent.name === event.name && 
                     Math.abs(dbEvent.date.getTime() - event.date.getTime()) < 60000 // 1 minute tolerance
      );

      if (!isDuplicate) {
        const newEventRef = doc(eventsCollection);
        batch.set(newEventRef, {
          ...event,
          date: Timestamp.fromDate(event.date),
          color: getRandomColor(),
        });
        newEventsCount++;
      }
    }

    if (newEventsCount > 0) {
      await batch.commit();
    }

    return { count: newEventsCount };
  }
);
