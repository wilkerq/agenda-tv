
'use server';
/**
 * @fileOverview A Genkit tool for fetching the daily event schedule from Firestore.
 * This tool allows AI flows to query the database for existing events on a given day.
 *
 * - getScheduleTool - The main tool definition.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { startOfDay, endOfDay, parseISO, format } from 'date-fns';
import { DailyScheduleSchema, ScheduleEvent } from '@/lib/types';
import { getAdminDb, ensureAdminInitialized } from '@/lib/firebase-admin';

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
        ensureAdminInitialized();
        const db = getAdminDb();
        const targetDate = parseISO(input.date);
        const start = startOfDay(targetDate);
        const end = endOfDay(targetDate);

        const eventsCollection = db.collection('events');
        const q = eventsCollection
            .where('date', '>=', Timestamp.fromDate(start))
            .where('date', '<=', Timestamp.fromDate(end));

        const querySnapshot = await q.get();

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
