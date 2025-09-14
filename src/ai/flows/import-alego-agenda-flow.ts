
'use server';
/**
 * @fileOverview A flow to import events from the official Alego agenda website.
 *
 * - importAlegoAgenda - Fetches, parses, and saves events from the Alego website.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, writeBatch, getDocs, query, where, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getRandomColor } from '@/lib/utils';
import { parse } from 'node-html-parser';
import { startOfMonth, endOfMonth } from 'date-fns';

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
    const url = 'https://portal.al.go.leg.br/agenda';
    
    // 1. Fetch HTML from the official agenda URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch agenda: ${response.statusText}`);
    }
    const html = await response.text();
    const root = parse(html);

    // 2. Extract raw event data from the HTML
    const eventElements = root.querySelectorAll('.compromisso-item');
    const rawEvents: { name: string, date: string, location: string }[] = [];
    
    const monthMap: { [key: string]: number } = {
        'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5, 
        'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
    };

    eventElements.forEach(item => {
        try {
            const dateText = item.querySelector('.compromisso-data')?.text.trim(); // "13 de AGOSTO de 2024"
            const timeStr = item.querySelector('.compromisso-horario')?.text.trim().replace('h', ':'); // "09:00"
            const name = item.querySelector('.compromisso-titulo a')?.text.trim();
            const location = item.querySelector('.compromisso-local')?.text.trim();

            if (dateText && timeStr && name && location) {
                const dateParts = dateText.split(' de ');
                const day = parseInt(dateParts[0]);
                const month = monthMap[dateParts[1].toLowerCase()];
                const year = parseInt(dateParts[2]);
                
                const [hour, minute] = timeStr.split(':').map(Number);
                
                if (!isNaN(day) && month !== undefined && !isNaN(year) && !isNaN(hour) && !isNaN(minute)) {
                    const eventDate = new Date(year, month, day, hour, minute);
                    rawEvents.push({ name, date: eventDate.toISOString(), location });
                }
            }
        } catch (e) {
            console.warn("Skipping an event due to parsing error:", e);
        }
    });

    if (rawEvents.length === 0) {
      return { count: 0 };
    }

    // 3. Use AI to process and enrich the event data
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-lite',
      output: { schema: z.array(AlegoEventSchema) },
      prompt: `Você é um assistente de agendamento especialista da Alego. Sua tarefa é processar uma lista de eventos brutos extraídos do site oficial, aplicar regras de negócio e retornar uma lista de eventos prontos para serem salvos.

**REGRAS OBRIGATÓRIAS:**

1.  **Determinar Tipo de Transmissão (transmission):**
    *   Se o nome do evento contiver "Sessão" ou "Comissão", a transmissão DEVE ser "tv".
    *   Para TODOS os outros tipos de evento (ex: "Audiência Pública", "Solenidade"), a transmissão DEVE ser "youtube".

2.  **Atribuir Operador (operator):**
    *   Você DEVE atribuir um operador com base na seguinte hierarquia de regras. A primeira regra que corresponder determina o operador.
    *   **Regra 1: Local Específico (Prioridade Máxima)**
        *   Se o local for "Sala Julio da Retifica \"CCJR\"", o operador DEVE ser "Mário Augusto".
    *   **Regra 2: Turnos Durante a Semana (Lógica Padrão)**
        *   Use a data/hora do evento para determinar o turno.
        *   **Manhã (00:00 - 12:00):** O operador padrão é "Rodrigo Sousa".
        *   **Tarde (12:01 - 18:00):** O operador DEVE ser um destes: "Ovidio Dias", "Mário Augusto" ou "Bruno Michel". Escolha um.
        *   **Noite (após 18:00):** O operador padrão é "Bruno Michel".

**Dados Brutos dos Eventos:**
${JSON.stringify(rawEvents, null, 2)}

Sua única saída deve ser um array JSON de eventos processados, seguindo o schema.
`,
    });

    if (!output) {
      throw new Error("AI failed to process events.");
    }
    
    const processedEvents = output;
    const batch = writeBatch(db);
    const eventsCollection = collection(db, "events");
    let newEventsCount = 0;

    for (const event of processedEvents) {
      const eventDate = new Date(event.date);
      const start = startOfMonth(eventDate);
      const end = endOfMonth(eventDate);

      // Check if a similar event already exists to avoid duplicates
      const q = query(
        eventsCollection,
        where('name', '==', event.name),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end))
      );
      const existingEvents = await getDocs(q);

      if (existingEvents.empty) {
        const newEvent = {
          ...event,
          date: Timestamp.fromDate(eventDate),
          color: getRandomColor(),
        };
        batch.set(doc(eventsCollection), newEvent);
        newEventsCount++;
      }
    }

    await batch.commit();

    return { count: newEventsCount };
  }
);
