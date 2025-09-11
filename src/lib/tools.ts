
'use server';
/**
 * @fileOverview Defines Genkit tools for use in AI flows.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { startOfDay, endOfDay } from 'date-fns';

// Define the schema for the data returned by the tool.
const EventSchema = z.object({
  name: z.string(),
  date: z.string().describe('The event date in ISO 8601 format'),
  operator: z.string(),
});

/**
 * A Genkit tool that fetches all events scheduled for a specific day from Firestore.
 * The AI model can call this tool to get context about the day's schedule
 * before making decisions, like assigning an operator.
 */
export const getEventsForDay = ai.defineTool(
  {
    name: 'getEventsForDay',
    description: 'Retrieves a list of all events scheduled for a given calendar day. Used to check for scheduling conflicts or to determine operator availability.',
    inputSchema: z.object({
      date: z.string().describe("The day to retrieve events for, in 'YYYY-MM-DD' format."),
    }),
    outputSchema: z.array(EventSchema),
  },
  async (input) => {
    try {
      const targetDate = new Date(input.date);
      // Adjust for timezone differences by getting the start and end of the day in UTC.
      const startOfTargetDay = startOfDay(targetDate);
      const endOfTargetDay = endOfDay(targetDate);

      const eventsCollection = collection(db, 'events');
      const q = query(
        eventsCollection,
        where('date', '>=', Timestamp.fromDate(startOfTargetDay)),
        where('date', '<=', Timestamp.fromDate(endOfTargetDay))
      );

      const querySnapshot = await getDocs(q);
      
      const events = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          name: data.name,
          date: (data.date as Timestamp).toDate().toISOString(),
          operator: data.operator,
        };
      });

      return events;
    } catch (error) {
      console.error('Error fetching events from Firestore:', error);
      // Return an empty array in case of an error to prevent the flow from breaking.
      return [];
    }
  }
);
