'use server';
/**
 * @fileOverview A flow for creating an event from scraped data (e.g., from n8n).
 *
 * - createScrapedEvent - A function that receives event data and prepares it for creation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the shape of the data we expect to receive from the scraping workflow
export const ScrapedEventInputSchema = z.object({
  name: z.string().describe("The name/title of the event."),
  date: z.string().describe("The date of the event in 'YYYY-MM-DD' format."),
  time: z.string().describe("The time of the event in 'HH:mm' format."),
  location: z.string().describe("The location/venue of the event."),
});
export type ScrapedEventInput = z.infer<typeof ScrapedEventInputSchema>;

export const ScrapedEventOutputSchema = z.object({
  success: z.boolean(),
  eventId: z.string().optional().nullable(),
  message: z.string(),
});
export type ScrapedEventOutput = z.infer<typeof ScrapedEventOutputSchema>;

// Wrapper function to be called from the API route
export async function createScrapedEvent(input: ScrapedEventInput): Promise<ScrapedEventOutput> {
    return createScrapedEventFlow(input);
}

const createScrapedEventFlow = ai.defineFlow(
  {
    name: 'createScrapedEventFlow',
    inputSchema: ScrapedEventInputSchema,
    outputSchema: ScrapedEventOutputSchema,
  },
  async (input) => {
    console.log("Received scraped event data:", input);

    // TODO: In the next step, add logic here to:
    // 1. Check if an identical event already exists.
    // 2. Use the Firebase Admin SDK to create a new document in the 'events' collection.
    // For now, we just simulate a successful reception.
    
    return {
      success: true,
      message: "Event data received successfully. Pending database insertion.",
      eventId: null,
    };
  }
);
