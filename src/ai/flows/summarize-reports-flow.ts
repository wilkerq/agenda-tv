
'use server';
/**
 * @fileOverview A flow for summarizing event report data.
 *
 * - summarizeReports - A function that generates a summary for report data.
 */

import { ai } from '@/ai/genkit';
import { 
    ReportDataInput, 
    ReportDataInputSchema, 
    ReportSummaryOutput, 
    ReportSummaryOutputSchema 
} from '@/lib/types';
import { z } from 'zod';

export async function summarizeReports(input: ReportDataInput): Promise<ReportSummaryOutput> {
    return summarizeReportsFlow(input);
}

const summarizeReportsFlow = ai.defineFlow(
    {
        name: 'summarizeReportsFlow',
        inputSchema: ReportDataInputSchema,
        outputSchema: ReportSummaryOutputSchema,
    },
    async (input) => {
        
        const llmResponse = await ai.generate({
            model: 'gemini-1.5-pro',
            prompt: `
              Você é um analista de dados especialista da Assembleia Legislativa de Goiás (Alego).
              Sua tarefa é gerar um resumo conciso e informativo em português, em um único parágrafo, com base nos dados de eventos fornecidos.
              
              Dados para Análise:
              - Total de Eventos: ${input.totalEvents}
              - Total de Eventos Noturnos (após 18h): ${input.totalNightEvents}
              - Eventos por Operador: ${JSON.stringify(input.reportData, null, 2)}
              - Eventos por Local: ${JSON.stringify(input.locationReport, null, 2)}
              - Eventos por Tipo de Transmissão: ${JSON.stringify(input.transmissionReport, null, 2)}

              Destaque os pontos mais importantes, como o operador com mais eventos, o local mais utilizado, e qualquer outra tendência relevante que você identificar. Seja direto e objetivo.
            `,
            output: {
              schema: ReportSummaryOutputSchema,
            },
        });
        
        const summary = llmResponse.output();
        
        if (!summary) {
            throw new Error("A IA não conseguiu gerar um resumo válido.");
        }
        
        return summary;
    }
);
