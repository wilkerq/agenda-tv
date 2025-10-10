'use server';
/**
 * @fileOverview A flow for summarizing event report data using pre-processing.
 *
 * - summarizeReports - A function that generates a summary for report data.
 */

import { ai } from '@/ai/genkit';
import { 
    ReportDataInput, 
    ReportDataInputSchema, 
    ReportSummaryOutput, 
    ReportSummaryOutputSchema,
    type ReportItem
} from '@/lib/types';
import { z } from 'zod';


// ETAPA 1: Lógica de pré-processamento encapsulada em uma função
// Esta função encontra o item com o maior número de eventos em uma lista.
function encontrarDestaque(lista: ReportItem[]): ReportItem {
  if (!lista || lista.length === 0) {
    return { nome: 'N/A', eventos: 0 };
  }
  // Usamos reduce para encontrar o objeto com o maior número de eventos.
  return lista.reduce((maior, item) => (item.eventos > maior.eventos ? item : maior), lista[0]);
}

// Exported wrapper function to be called from the frontend
export async function summarizeReports(input: ReportDataInput): Promise<ReportSummaryOutput> {
    return summarizeReportsFlow(input);
}

// ETAPA 2: Definir o fluxo principal do Genkit
const summarizeReportsFlow = ai.defineFlow(
    {
        name: 'summarizeReportsFlow',
        inputSchema: ReportDataInputSchema,
        outputSchema: ReportSummaryOutputSchema,
    },
    async (input) => {
        // --- LÓGICA DE PRÉ-PROCESSAMENTO ---
        const operadorDestaque = encontrarDestaque(input.reportData);
        const localDestaque = encontrarDestaque(input.locationReport);

        // --- MONTAGEM DO PROMPT REFINADO ---
        const prompt = `
            Você é um analista de comunicação de dados da Assembleia Legislativa de Goiás (Alego), localizado em Goiás, Brasil.
            Sua tarefa é redigir um resumo informativo e profissional em um único parágrafo, utilizando os dados e os pontos de destaque já calculados.

            **Contexto Geral:**
            - Total de Eventos Analisados: ${input.totalEvents}
            - Total de Eventos Noturnos (após 18h): ${input.totalNightEvents}

            **Pontos de Destaque (já calculados):**
            - Operador com mais atividade: ${operadorDestaque.nome} (${operadorDestaque.eventos} eventos)
            - Local mais utilizado: ${localDestaque.nome} (${localDestaque.eventos} eventos)
            - Detalhes de transmissão: ${JSON.stringify(input.transmissionReport)}

            **Sua Tarefa:**
            Com base estritamente nos fatos apresentados, escreva um parágrafo conciso e coeso para um relatório gerencial. Incorpore os 'Pontos de Destaque' de forma fluida na narrativa.
        `;

        // --- CHAMADA PARA A IA ---
        const llmResponse = await ai.generate({
            model: 'googleai/gemini-1.5-pro',
            prompt: prompt,
            config: {
                temperature: 0.3, // Baixa temperatura para respostas mais factuais e menos criativas
            },
        });

        const resumo = llmResponse.output() as string;
        
        if (!resumo) {
            throw new Error("A IA não conseguiu gerar um resumo válido.");
        }

        // --- RETORNO ESTRUTURADO ---
        return {
            resumoNarrativo: resumo,
            destaques: {
                operador: operadorDestaque,
                local: localDestaque,
            }
        };
    }
);
