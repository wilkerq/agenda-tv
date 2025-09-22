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
import { addDays, startOfDay, isValid, format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const ImportAlegoAgendaOutputSchema = z.object({
  count: z.number().describe('The number of new events imported.'),
});
export type ImportAlegoAgendaOutput = z.infer<typeof ImportAlegoAgendaOutputSchema>;

// The structure of the event object from the Alego API
interface AlegoApiEvent {
    id: string;
    title: string;
    start: string; // ISO 8601 format (e.g., "2024-08-13T09:00:00")
    end: string;
    url: string;
    location: string;
    description: string;
    class: string;
}

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

    // Rule 1: Specific Location
    if (location === 'Sala Julio da Retifica "CCJR"') {
        return "Mário Augusto";
    }

    // Rule 2: Weekday Shifts
    if (hour < 12) {
        return "Rodrigo Sousa"; // Morning default
    }
    if (hour >= 12 && hour < 18) { // Afternoon rotation
        const operators = ["Ovidio Dias", "Mário Augusto", "Bruno Michel"];
        return operators[Math.floor(Math.random() * operators.length)];
    }
    return "Bruno Michel"; // Night default
};

// Function to determine transmission type
const determineTransmission = (location: string): 'youtube' | 'tv' => {
    if (location === "Plenário Iris Rezende Machado") {
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
    const startDate = startOfMonth(today);
    const endDate = endOfMonth(addDays(today, 15)); // Fetch for current and next month to cover 15 days

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    
    // Alego's official AJAX endpoint for calendar events
    const url = `https://portal.al.go.leg.br/agenda/get_eventos_ajax?start=${startStr}&end=${endStr}`;

    try {
        const response = await fetch(url, { 
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch agenda API: ${response.statusText}`);
        }
        
        const apiResponse = await response.json();

        if (!apiResponse.success || !Array.isArray(apiResponse.result)) {
            throw new Error('Invalid API response structure from Alego');
        }
        
        const apiEvents: AlegoApiEvent[] = apiResponse.result;

        for (const event of apiEvents) {
            const eventDate = parseISO(event.start);

            if (!isValid(eventDate) || !event.title || !event.location) {
                continue; // Skip invalid events
            }

            // Clean up location string
            const location = event.location.replace(/Local:\s*/, '').trim();

            processedEvents.push({
                name: event.title,
                date: eventDate,
                location: location,
                transmission: determineTransmission(location),
                operator: assignOperator(eventDate, location),
            });
        }
    } catch (error) {
        console.error('Error fetching or processing Alego agenda via API:', error);
        return { count: 0 }; // Exit if API fails
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
        const monthDate = parseISO(monthStr + '-01');
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
