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
import 'dotenv/config';

// Exported wrapper function
export async function generateWhatsAppMessage(input: WhatsAppMessageInput): Promise<WhatsAppMessageOutput> {
  return generateWhatsAppMessageFlow(input);
}

// Flow Definition
const generateWhatsAppMessageFlow = ai.defineFlow(
  {
    name: 'generateWhatsAppMessageFlow',
    inputSchema: WhatsAppMessageInputSchema,
    outputSchema: WhatsAppMessageOutputSchema,
  },
  async (input) => {

    // --- AI Call Disabled - Using Simple String Formatting ---
    const greeting = `Olá, *${input.operatorName}*! 👋\n\n`;
    const scheduleHeader = `Sua agenda para *${input.scheduleDate}* está pronta:\n\n`;
    const eventsHeader = `📅 Eventos:\n`;
    const eventList = input.events.join('\n');
    const closing = `\n\nQualquer dúvida, estou à disposição! Tenha um excelente dia! ✨`;
    const message = greeting + scheduleHeader + eventsHeader + eventList + closing;

    // 2. Send the generated message to the n8n webhook
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!webhookUrl || webhookUrl.includes('INSIRA_SUA_URL_AQUI')) {
      console.warn('N8N_WEBHOOK_URL not set. Skipping automatic sending.');
      // Return the message so it can be manually copied
      return { message, sent: false };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: input.operatorPhone,
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`n8n webhook returned status ${response.status}`);
      }

       return { message, sent: true };

    } catch (error) {
      console.error('Error sending message to n8n webhook:', error);
      // Return the message anyway, but indicate it was not sent
      return { message, sent: false };
    }
  }
);
