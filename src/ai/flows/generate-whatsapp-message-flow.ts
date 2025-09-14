
'use server';
/**
 * @fileOverview A flow for generating a friendly WhatsApp message and sending it via n8n.
 *
 * - generateWhatsAppMessage - Creates a message and sends it to an n8n webhook.
 */

import { ai } from '@/ai/genkit';
import { 
    WhatsAppMessageInput, 
    WhatsAppMessageInputSchema, 
    WhatsAppMessageOutput, 
    WhatsAppMessageOutputSchema 
} from '@/lib/types';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Exported wrapper function
export async function generateWhatsAppMessage(input: WhatsAppMessageInput): Promise<WhatsAppMessageOutput> {
  return generateWhatsAppMessageFlow(input);
}

// Prompt Definition
const prompt = ai.definePrompt({
  name: 'generateWhatsAppMessagePrompt',
  model: 'googleai/gemini-pro',
  input: { schema: WhatsAppMessageInputSchema },
  output: { schema: WhatsAppMessageOutputSchema },
  prompt: `Você é o assistente de agendamento da Alego. Sua tarefa é criar uma mensagem de WhatsApp clara, profissional e amigável para informar a agenda de um operador.

**REGRAS OBRIGATÓRIAS:**
1.  **Tom e Linguagem:** Mantenha um tom amigável, mas profissional.
2.  **Formatação:** Use negrito (asteriscos) para o nome do operador e para a data da agenda.
3.  **Emojis Específicos:** Use os seguintes emojis EXATAMENTE como especificado:
    *   👋 no final da saudação (Ex: Olá, *Nome*! 👋).
    *   📅 antes do cabeçalho "Eventos".
    *   ✨ no final da mensagem de despedida.
4.  **Exemplo de Saída:** Siga o formato do exemplo à risca.

**EXEMPLO DE SAÍDA:**
Olá, *Rodrigo Sousa*! 👋

Sua agenda para *terça-feira, 13 de agosto de 2024* está pronta:

📅 Eventos:
- 09:00h: Sessão Ordinária (Plenário Iris Rezende Machado)
- 14:00h: Reunião da CCJ (Sala Julio da Retifica "CCJR")

Qualquer dúvida, estou à disposição! Tenha um excelente dia! ✨

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
    // 1. Generate the message using the LLM
    const { output } = await prompt(input);
    if (!output?.message) {
      throw new Error("Failed to generate message text.");
    }
    
    // 2. Send the generated message to the n8n webhook
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!webhookUrl || webhookUrl === 'INSIRA_SUA_URL_AQUI') {
      console.warn('N8N_WEBHOOK_URL not set. Skipping automatic sending.');
      // Return the message so it can be manually copied
      return { message: output.message, sent: false };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: input.operatorPhone,
          message: output.message,
        }),
      });

      if (!response.ok) {
        throw new Error(`n8n webhook returned status ${response.status}`);
      }

       return { message: output.message, sent: true };

    } catch (error) {
      console.error('Error sending message to n8n webhook:', error);
      // Return the message anyway, but indicate it was not sent
      return { message: output.message, sent: false };
    }
  }
);
