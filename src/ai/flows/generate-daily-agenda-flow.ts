
'use server';
/**
 * @fileOverview A flow for generating a daily agenda WhatsApp message.
 *
 * - generateDailyAgenda - A function that creates a message from a list of events for a specific day.
 */

import { ai } from '@/ai/genkit';
import { 
    DailyAgendaInput,
    DailyAgendaInputSchema,
    DailyAgendaOutput,
    DailyAgendaOutputSchema 
} from '@/lib/types';


// Exported wrapper function
export async function generateDailyAgenda(input: DailyAgendaInput): Promise<DailyAgendaOutput> {
  return generateDailyAgendaFlow(input);
}

// Prompt Definition
const prompt = ai.definePrompt({
  name: 'generateDailyAgendaPrompt',
  model: 'googleai/gemini-2.5-flash-lite',
  input: { schema: DailyAgendaInputSchema },
  output: { schema: DailyAgendaOutputSchema },
  prompt: `Você é um assistente de comunicação da Alego. Sua tarefa é criar a "Pauta do Dia" em um formato claro e profissional para ser compartilhado no WhatsApp.

**REGRAS OBRIGATÓRIAS:**
1.  **Título:** A mensagem DEVE começar com "PAUTA DO DIA" em negrito, seguido de um emoji de claquete (🎬).
2.  **Data:** Inclua a data fornecida em negrito (ex: *terça-feira, 13 de agosto de 2024*).
3.  **Formato do Texto:** Use negrito para o título e a data.
4.  **Linguagem:** Seja direto, profissional e informativo.

**Exemplo de Mensagem de Saída (siga este formato EXATAMENTE):**
"*PAUTA DO DIA* 🎬

*terça-feira, 13 de agosto de 2024*

- 09:00h: Sessão Ordinária (Plenário Iris Rezende Machado)
- 11:00h: Reunião da Comissão de Educação (Auditório Solon Amaral)
- 14:00h: Audiência Pública sobre Saúde (Auditório Carlos Vieira)"

**Dados para a Mensagem:**
- Data da Agenda: {{{scheduleDate}}}
- Lista de Eventos (um por linha):
{{#each events}}
{{{this}}}
{{/each}}
`,
});

// Flow Definition
const generateDailyAgendaFlow = ai.defineFlow(
  {
    name: 'generateDailyAgendaFlow',
    inputSchema: DailyAgendaInputSchema,
    outputSchema: DailyAgendaOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
