
'use server';
/**
 * @fileOverview AI-powered team scheduling using Vercel AI SDK.
 */

import { generateObject } from 'ai';
import { aiModel } from '@/lib/ai';
import { z } from 'zod';
import type { EventInput, Personnel, ProductionPersonnel } from '@/lib/types';

interface AISchedulerInput {
    event: EventInput;
    pools: {
        transmissionOps: Personnel[];
        cinematographicReporters: Personnel[];
        reporters: ProductionPersonnel[];
        producers: ProductionPersonnel[];
    };
    allEvents: EventInput[];
}

// Schema for the expected output from the AI model
const AISchedulerOutputSchema = z.object({
  transmissionOperator: z.string().optional().nullable(),
  cinematographicReporter: z.string().optional().nullable(),
  reporter: z.string().optional().nullable(),
  producer: z.string().optional().nullable(),
  reasoning: z.string().optional().describe("A brief explanation for the team selection choices."),
});

export type AISchedulerOutput = z.infer<typeof AISchedulerOutputSchema>;

/**
 * Uses an AI model to suggest a team for a given event.
 * @param input - The event details, personnel pools, and existing schedules.
 * @returns The suggested team members for each role.
 */
export async function scheduleWithAI(input: AISchedulerInput): Promise<AISchedulerOutput> {
  const { event, pools, allEvents } = input;
  
  const eventsToday = allEvents.filter(e => new Date(e.date).toDateString() === new Date(event.date).toDateString());

  const { object } = await generateObject({
    model: aiModel,
    schema: AISchedulerOutputSchema,
    prompt: `You are an expert TV station scheduler. Your task is to select the best personnel for an event based on availability, turn, and workload.
      
      Event Details:
      - Name: ${event.name}
      - Date: ${new Date(event.date).toLocaleDateString('pt-BR')}
      - Time: ${new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      - Location: ${event.location}
      - Type: ${event.transmissionTypes.join(', ')}
      ${event.departure ? `- Departure: ${new Date(event.departure).toLocaleString('pt-BR')}` : ''}
      ${event.arrival ? `- Arrival: ${new Date(event.arrival).toLocaleString('pt-BR')}` : ''}

      Available Personnel:
      - Operators: ${JSON.stringify(pools.transmissionOps.map(p => p.name))}
      - Cine Reporters: ${JSON.stringify(pools.cinematographicReporters.map(p => p.name))}
      - Reporters: ${JSON.stringify(pools.reporters.map(p => p.name))}
      - Producers: ${JSON.stringify(pools.producers.map(p => p.name))}

      Existing Schedule for the day:
      - ${JSON.stringify(eventsToday.map(e => ({ name: e.name, time: new Date(e.date).toLocaleTimeString('pt-BR'), team: [e.transmissionOperator, e.cinematographicReporter, e.reporter, e.producer].filter(Boolean) })), null, 2)}
      
      Your goal is to fill the roles: transmissionOperator, cinematographicReporter, reporter, and producer.
      Prioritize personnel who are not busy, whose work turn matches the event time, and who have a lighter workload.
      Provide a brief reasoning for your choices. Select only from the provided lists. If no one is suitable for a role, leave it as null.
      `,
  });

  return object;
}
