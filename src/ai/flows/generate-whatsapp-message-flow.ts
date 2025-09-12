
'use server';
/**
 * @fileOverview A flow for generating a friendly WhatsApp message for an operator's schedule.
 *
 * - generateWhatsAppMessage - A function that creates a message from a list of events.
 * - WhatsAppMessageInput - The input type for the flow.
 * - WhatsAppMessageOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input Schema
export const WhatsAppMessageInputSchema = z.object({
  operatorName: z.string().describe("The name of the operator."),
  scheduleDate: z.string().describe("The date of the schedule (e.g., 'terça-feira, 13 de agosto de 2024')."),
  events: z.array(z.string()).describe("A list of formatted event strings, each including time, name, and location."),
});
export type WhatsAppMessageInput = z.infer<typeof WhatsAppMessageInputSchema>;

// Output Schema
export const WhatsAppMessageOutputSchema = z.object({
  message: z.string().describe("The full, friendly, and formatted WhatsApp message."),
});
export type WhatsAppMessageOutput = z.infer<typeof WhatsAppMessageOutputSchema>;


// Exported wrapper function
export async function generateWhatsAppMessage(input: WhatsAppMessageInput): Promise<WhatsAppMessageOutput> {
  return generateWhatsAppMessageFlow(input);
}

// Prompt Definition
const prompt = ai.definePrompt({
  name: 'generateWhatsAppMessagePrompt',
  model: 'googleai/gemini-2.5-flash-lite',
  input: { schema: WhatsAppMessageInputSchema },
  output: { schema: WhatsAppMessageOutputSchema },
  prompt: `Você é um assistente de agendamento amigável e eficiente para a Alego. Sua tarefa é criar uma mensagem de WhatsApp clara e concisa para um operador, informando sua agenda para um dia específico.

Seja amigável, mas direto. Use emojis para tornar a mensagem mais visual e agradável.

**Instruções:**
1.  Comece com uma saudação calorosa para o operador (use o nome dele).
2.  Informe claramente a data da agenda.
3.  Liste os eventos de forma organizada, usando a lista fornecida.
4.  Termine com uma mensagem de despedida positiva.
5.  Formate a mensagem usando a sintaxe do WhatsApp (negrito, itálico, etc.) para melhor legibilidade.

**Exemplo de Mensagem de Saída:**
"Olá, *Rodrigo Sousa*! 👋

Aqui está sua agenda para *terça-feira, 13 de agosto de 2024*:

📅 Eventos:
- 09:00h: Sessão Ordinária (Plenário Iris Rezende Machado)
- 14:00h: Reunião da CCJ (Sala Julio da Retifica "CCJR")

Qualquer dúvida, é só chamar! Tenha um ótimo dia de trabalho! ✨"

**Dados para a Mensagem:**
- Nome do Operador: {{{operatorName}}}
- Data da Agenda: {{{scheduleDate}}}
- Lista de Eventos:
{{#each events}}
{{{this}}}
{{/each}}
`,
});

// Flow Definition
const generateWhatsAppMessageFlow = ai.defineFlow(
  {
    name: 'generateWhatsAppMessageFlow',
    inputSchema: WhatsAppMessageInputSchema,
    outputSchema: WhatsAppMessageOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
