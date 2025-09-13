
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
  prompt: `Você é o assistente de agendamento da Alego.
Sua tarefa é criar uma mensagem de WhatsApp clara, profissional e amigável para informar a agenda de um operador.

**REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:**
1.  **Emojis Específicos:** Use os seguintes emojis EXATAMENTE como especificado:
    - 👋 no final da saudação (Ex: Olá, *Nome*! 👋).
    - 📅 antes do cabeçalho "Eventos".
    - ✨ no final da mensagem de despedida.
2.  **Formato de Texto:** Use negrito (asteriscos) para o nome do operador e para a data da agenda.
3.  **Linguagem:** Mantenha um tom amigável e profissional.

**EXEMPLO DE SAÍDA (Siga este formato à risca):**
"Olá, *Rodrigo Sousa*! 👋

Sua agenda para *terça-feira, 13 de agosto de 2024* está pronta:

📅 Eventos:
- 09:00h: Sessão Ordinária (Plenário Iris Rezende Machado)
- 14:00h: Reunião da CCJ (Sala Julio da Retifica "CCJR")

Qualquer dúvida, estou à disposição! Tenha um excelente dia! ✨"

**Dados de Entrada para a Mensagem:**
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
