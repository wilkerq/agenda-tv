'use server';
/**
 * @fileOverview A flow for generating a daily agenda WhatsApp message using AI.
 *
 * - generateDailyAgenda - A function that creates a message from a list of events for a specific day.
 */
import { 
    DailyAgendaInput,
    DailyAgendaInputSchema,
    DailyAgendaOutput,
    DailyAgendaOutputSchema,
} from '@/lib/types';
import { ai } from '@/ai/genkit';
import { getModel } from '@/lib/ai-provider';

// Exported wrapper function
export async function generateDailyAgenda(input: DailyAgendaInput): Promise<DailyAgendaOutput> {
  return generateDailyAgendaFlow(input);
}

// Flow Definition
const generateDailyAgendaFlow = ai.defineFlow(
  {
    name: 'generateDailyAgendaFlow',
    inputSchema: DailyAgendaInputSchema,
    outputSchema: DailyAgendaOutputSchema,
  },
  async (input) => {
    const textModel = await getModel();

    // Prompt Definition
    const prompt = ai.definePrompt({
      name: 'generateDailyAgendaPrompt',
      model: textModel,
      input: { schema: DailyAgendaInputSchema },
      output: { schema: DailyAgendaOutputSchema },
      prompt: `Você é o assistente de pautas da TV Assembleia Legislativa de Goiás (Alego). Sua tarefa é criar uma mensagem de pauta diária clara, organizada e profissional para ser compartilhada, por exemplo, no WhatsApp.

    **REGRAS OBRIGATÓRIAS:**
    1.  **Título:** A mensagem DEVE começar com o título "*PAUTA DO DIA*" seguido de um emoji de claquete (🎬).
    2.  **Formatação da Data:** Logo após o título, insira a data da agenda em negrito (Ex: *terça-feira, 13 de agosto de 2024*).
    3.  **Lista de Eventos:** Liste todos os eventos fornecidos. A lista deve ser formatada como um item de texto simples, com cada evento em uma nova linha.
    4.  **Estrutura Final:** A mensagem deve seguir exatamente esta estrutura: Título, Data e a lista de eventos. Não adicione saudações ou despedidas.

    **EXEMPLO DE SAÍDA:**
    *PAUTA DO DIA* 🎬

    *terça-feira, 13 de agosto de 2024*

    - 09:00h: Sessão Ordinária (Plenário Iris Rezende Machado)
    - 14:00h: Reunião da CCJ (Sala Julio da Retifica "CCJR")

    **Dados de Entrada para a Pauta:**
    - Data da Pauta: {{{scheduleDate}}}
    - Lista de Eventos:
    {{#each events}}
    {{{this}}}
    {{/each}}
    `,
    });

    // Generate the message using the LLM
    const { output } = await prompt(input);
    if (!output?.message) {
      throw new Error("A IA falhou em gerar o texto da pauta.");
    }
    
    return { message: output.message };
  }
);
