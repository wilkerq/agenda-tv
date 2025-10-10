
'use server';
/**
 * @fileOverview A flow for summarizing event report data.
 *
 * - summarizeReports - A function that generates a summary for report data.
 */

import { ai, googleAI } from '@/ai/genkit';
import { 
    ReportDataInput, 
    ReportDataInputSchema, 
    ReportSummaryOutput, 
    ReportSummaryOutputSchema 
} from '@/lib/types';

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
            model: googleAI.model('gemini-1.5-pro-latest'),
            output: { schema: ReportSummaryOutputSchema },
            prompt: `
              Você é um analista de dados especialista da Assembleia Legislativa de Goiás (Alego).
              Sua tarefa é criar um resumo conciso e perspicaz em um único parágrafo, em português do Brasil,
              com base nos dados de relatório fornecidos.

              **Dados do Relatório:**
              - Total de Eventos: ${input.totalEvents}
              - Total de Eventos Noturnos: ${input.totalNightEvents}
              - Eventos por Operador: ${JSON.stringify(input.reportData, null, 2)}
              - Eventos por Local: ${JSON.stringify(input.locationReport, null, 2)}
              - Eventos por Tipo de Transmissão: ${JSON.stringify(input.transmissionReport, null, 2)}

              **Instruções para o Resumo:**
              1.  Comece com uma visão geral do número total de eventos.
              2.  Destaque os operadores mais ativos, mencionando o número de eventos que cobriram.
              3.  Analise a distribuição de eventos (por exemplo, se há um local predominante ou um tipo de transmissão mais comum).
              4.  Incorpore o número de eventos noturnos, se for um dado relevante.
              5.  Mantenha a linguagem profissional, objetiva e baseada em dados.
              6.  O resumo deve ser um parágrafo único e coeso.
              7.  Sua saída deve ser um objeto JSON contendo apenas a chave "summary".

              Gere o resumo.
            `,
        });

        const summary = llmResponse.output();
        if (!summary) {
            throw new Error("AI failed to generate a summary.");
        }
        return summary;
    }
);
