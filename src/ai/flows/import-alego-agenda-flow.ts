
'use server';
/**
 * @fileOverview A flow to import events from the official Alego agenda website.
 *
 * - importAlegoAgenda - Fetches, parses, and saves events from the Alego website for the next 15 days.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, writeBatch, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getRandomColor } from '@/lib/utils';
import { parse } from 'node-html-parser';
import { startOfMonth, endOfMonth, isValid, format, addDays, startOfDay } from 'date-fns';

const AlegoEventSchema = z.object({
  name: z.string().describe('The full, detailed name of the event.'),
  date: z.string().describe('The event date and time in ISO 8601 format.'),
  location: z.string().describe('The specific location of the event.'),
  transmission: z.enum(['youtube', 'tv']).describe('The transmission type.'),
  operator: z.string().describe('The assigned operator.'),
});

const ImportAlegoAgendaOutputSchema = z.object({
  count: z.number().describe('The number of new events imported.'),
});
export type ImportAlegoAgendaOutput = z.infer<typeof ImportAlegoAgendaOutputSchema>;

export async function importAlegoAgenda(): Promise<ImportAlegoAgendaOutput> {
  return importAlegoAgendaFlow();
}

const importAlegoAgendaFlow = ai.defineFlow(
  {
    name: 'importAlegoAgendaFlow',
    outputSchema: ImportAlegoAgendaOutputSchema,
  },
  async () => {
    const allEventsHtml: string[] = [];
    const today = new Date();

    // 1. Loop through the next 15 days and fetch HTML for each day
    for (let i = 0; i < 15; i++) {
      const targetDate = addDays(today, i);
      const dateString = format(targetDate, 'dd/MM/yyyy');
      const url = `https://portal.al.go.leg.br/agenda?data=${dateString}`;
      
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          console.warn(`Failed to fetch agenda for ${dateString}: ${response.statusText}`);
          continue; // Skip to the next day
        }
        const html = await response.text();
        const root = parse(html);

        const eventElements = root.querySelectorAll('.compromisso-item');
        if (eventElements.length > 0) {
            eventElements.forEach(el => allEventsHtml.push(el.toString()));
        }
      } catch (error) {
        console.error(`Error fetching or parsing agenda for ${dateString}:`, error);
      }
    }
    
    if (allEventsHtml.length === 0) {
      return { count: 0 };
    }

    // 2. Use AI to process and enrich the event data from raw HTML
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-lite',
      output: { schema: z.array(AlegoEventSchema) },
      prompt: `Você é um assistente de agendamento especialista da Alego. Sua tarefa é processar uma lista de blocos HTML, onde cada bloco representa um evento, e retornar uma lista de objetos de evento prontos para serem salvos. O ano atual é ${new Date().getFullYear()}.

Para cada bloco HTML na lista, você deve:
1. Extrair o nome completo do evento, a data, a hora e o local. A data estará no formato "DD de MÊS de AAAA". Combine a data e a hora em uma única string ISO 8601.
2. Aplicar as seguintes regras de negócio para determinar a transmissão e o operador.

**REGRAS OBRIGATÓRIAS:**

1.  **Determinar Tipo de Transmissão (transmission):**
    *   Se o nome do evento contiver "Sessão" ou "Comissão", a transmissão DEVE ser "tv".
    *   Para TODOS os outros tipos de evento (ex: "Audiência Pública", "Solenidade"), a transmissão DEVE ser "youtube".

2.  **Atribuir Operador (operator):**
    *   Você DEVE atribuir um operador com base na seguinte hierarquia de regras.
    *   **Regra 1: Local Específico (Prioridade Máxima)**
        *   Se o local for "Sala Julio da Retifica \"CCJR\"", o operador DEVE ser "Mário Augusto".
    *   **Regra 2: Turnos Durante a Semana (Lógica Padrão)**
        *   Use a data/hora do evento para determinar o turno.
        *   **Manhã (00:00 - 12:00):** O operador padrão é "Rodrigo Sousa".
        *   **Tarde (12:01 - 18:00):** O operador DEVE ser um destes: "Ovidio Dias", "Mário Augusto" ou "Bruno Michel". Escolha um aleatoriamente.
        *   **Noite (após 18:00):** O operador padrão é "Bruno Michel".

**Dados Brutos dos Eventos (HTML):**
${JSON.stringify(allEventsHtml, null, 2)}

Sua única saída deve ser um array JSON de eventos processados. Não inclua eventos que não puderam ser totalmente analisados ou que não tenham data e hora.`,
    });

    if (!output || output.length === 0) {
      return { count: 0 };
    }
    
    // Filter out invalid or past events
    const validProcessedEvents = output.filter(event => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      return isValid(eventDate) && eventDate >= startOfDay(today);
    });


    if (validProcessedEvents.length === 0) {
        return { count: 0 };
    }

    const batch = writeBatch(db);
    const eventsCollection = collection(db, "events");
    let newEventsCount = 0;

    // Fetch existing events for the relevant months to avoid duplicates
    const relevantMonths = [...new Set(validProcessedEvents.map(e => format(new Date(e.date), 'yyyy-MM')))];
    const existingEventsInDb: { name: string, date: Date }[] = [];

    for (const monthStr of relevantMonths) {
        const monthDate = new Date(monthStr + '-01T00:00:00Z');
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
      const eventDate = new Date(event.date);

      const isDuplicate = existingEventsInDb.some(
          dbEvent => dbEvent.name === event.name && 
                     Math.abs(dbEvent.date.getTime() - eventDate.getTime()) < 60000 // 1 minute tolerance
      );

      if (!isDuplicate) {
        const newEvent = {
          ...event,
          date: Timestamp.fromDate(eventDate),
          color: getRandomColor(),
        };
        batch.set(doc(eventsCollection), newEvent);
        newEventsCount++;
      }
    }

    if (newEventsCount > 0) {
      await batch.commit();
    }

    return { count: newEventsCount };
  }
);
