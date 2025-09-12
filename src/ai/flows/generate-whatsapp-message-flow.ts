
'use server';
/**
 * @fileOverview A flow for generating a friendly WhatsApp message for an operator's schedule.
 *
 * - generateWhatsAppMessage - A function that creates a message from a list of events.
 */

import { ai } from '@/ai/genkit';
import { 
    WhatsAppMessageInput, 
    WhatsAppMessageInputSchema, 
    WhatsAppMessageOutput, 
    WhatsAppMessageOutputSchema 
} from '@/lib/types';


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
  prompt: `Você é um assistente de agendamento para a Alego. Sua tarefa é criar uma mensagem de WhatsApp para um operador, informando sua agenda.

**REGRAS OBRIGATÓRIAS:**
1.  **Use Emojis Específicos:** Você DEVE usar os seguintes emojis nos locais exatos:
    - 👋 no final da saudação inicial (Ex: Olá, *Nome*! 👋).
    - 📅 antes da palavra "Eventos".
    - ✨ no final da mensagem de despedida.
2.  **Formato do Texto:** Formate o nome do operador e a data da agenda em negrito, usando asteriscos (ex: *Nome do Operador* e *terça-feira, 13 de agosto de 2024*).
3.  **Linguagem:** Seja amigável, profissional e conciso.

**Exemplo de Mensagem de Saída (siga este formato EXATAMENTE):**
"Olá, *Rodrigo Sousa*! 👋

Sua agenda para *terça-feira, 13 de agosto de 2024* está pronta:

📅 Eventos:
- 09:00h: Sessão Ordinária (Plenário Iris Rezende Machado)
- 14:00h: Reunião da CCJ (Sala Julio da Retifica "CCJR")

Qualquer dúvida, estou à disposição! Tenha um excelente dia! ✨"

**Dados para a Mensagem:**
- Nome do Operador: {{{operatorName}}}
- Data da Agenda: {{{scheduleDate}}}
- Lista de Eventos (um por linha):
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
