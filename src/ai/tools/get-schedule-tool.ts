
'use server';
/**
 * @fileOverview A Genkit tool for fetching the daily event schedule from Firestore.
 * This tool allows AI flows to query the database for existing events on a given day.
 *
 * - getScheduleTool - The main tool definition.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfDay, endOfDay, parseISO, format } from 'date-fns';
import { DailyScheduleSchema, ScheduleEvent } from '@/lib/types';

export const getScheduleTool = ai.defineTool(
    {
        name: 'getSchedule',
        description: 'Retrieves the list of scheduled events for a specific calendar day.',
        inputSchema: z.object({
            date: z.string().describe("The date to fetch the schedule for, in 'YYYY-MM-DD' format."),
        }),
        outputSchema: DailyScheduleSchema,
    },
    async (input) => {
        const targetDate = parseISO(input.date);
        const start = startOfDay(targetDate);
        const end = endOfDay(targetDate);

        const eventsCollection = collection(db, 'events');
        const q = query(
            eventsCollection,
            where('date', '>=', Timestamp.fromDate(start)),
            where('date', '<=', Timestamp.fromDate(end))
        );

        const querySnapshot = await getDocs(q);

        const events: ScheduleEvent[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const eventDate = (data.date as Timestamp).toDate();
            return {
                name: data.name,
                time: format(eventDate, 'HH:mm'),
                transmissionOperator: data.transmissionOperator,
            };
        });

        return { events };
    }
);
