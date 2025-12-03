
'use server';
/**
 * @fileOverview A flow for summarizing event report data. Can use AI or local logic.
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

// Helper function to find the standout item in a list
function encontrarDestaque(lista: ReportItem[]): ReportItem {
  if (!lista || lista.length === 0) {
    return { nome: 'N/A', eventos: 0 };
  }
  return lista.reduce((maior, item) => (item.eventos > maior.eventos ? item : maior), lista[0]);
}

// AI-powered summarization prompt
const summarizePrompt = ai.definePrompt({
    name: 'summarizeReportsPrompt',
    model: 'ollama/llama3:latest',
    input: { schema: ReportDataInputSchema },
    output: { schema: ReportSummaryOutputSchema },
    prompt: `You are an expert data analyst for a TV station. Your task is to provide a concise, insightful, and narrative summary based on the provided event data. Your summary must be in Brazilian Portuguese.

    Data Provided:
    - Total Events: {{{totalEvents}}}
    - Total Night Events (after 6 PM): {{{totalNightEvents}}}
    - Performance by Operator: {{json reportData}}
    - Events by Location: {{json locationReport}}
    - Events by Transmission Type: {{json transmissionReport}}

    Based on this data, generate a "resumoNarrativo" (narrative summary) and identify the "destaques" (highlights) for the operator and location with the most events.

    The summary should be a fluid paragraph, not just a list of stats. Highlight key trends, like the percentage of night events or standout performers.
    Example Tone: "No período analisado, a equipe realizou X eventos, com um número expressivo de Y (Z%) ocorrendo no período noturno, indicando uma alta demanda de cobertura à noite. O destaque de produtividade foi [Nome], com [N] eventos. O local mais frequentado foi [Local], com [M] eventos."
    `,
});

// Main exported function
export async function summarizeReports(input: ReportDataInput, mode: 'ai' | 'logic'): Promise<ReportSummaryOutput> {
    return summarizeReportsFlow({ ...input, mode });
}

const SummarizeReportsFlowInputSchema = ReportDataInputSchema.extend({
    mode: z.enum(['ai', 'logic']),
});


// Genkit Flow Definition
const summarizeReportsFlow = ai.defineFlow(
    {
        name: 'summarizeReportsFlow',
        inputSchema: SummarizeReportsFlowInputSchema,
        outputSchema: ReportSummaryOutputSchema,
    },
    async (input) => {
        if (input.mode === 'ai') {
            // --- AI MODE ---
            const { output } = await summarizePrompt(input);
            return output!;
        } else {
            // --- LOGIC MODE ---
            const operadorDestaque = encontrarDestaque(input.reportData);
            const localDestaque = encontrarDestaque(input.locationReport);
            const totalTransmissions = input.transmissionReport.reduce((acc, item) => acc + item.eventos, 0);

            const summaryParts: string[] = [];

            if (input.totalEvents > 0) {
                summaryParts.push(`📊 No período analisado, um total de ${input.totalEvents} eventos foram registrados.`);
                
                if (input.totalNightEvents > 0) {
                    const nightPercentage = ((input.totalNightEvents / input.totalEvents) * 100).toFixed(1);
                    summaryParts.push(`🌙 ${input.totalNightEvents} (${nightPercentage}%) destes ocorreram no período noturno, mostrando uma atividade significativa após as 18h.`);
                }

                if (operadorDestaque.eventos > 0) {
                    const productivityPercentage = ((operadorDestaque.eventos / input.totalEvents) * 100).toFixed(1);
                    summaryParts.push(`🏆 O destaque de produtividade foi ${operadorDestaque.nome}, responsável por ${operadorDestaque.eventos} eventos, o que representa ${productivityPercentage}% do total.`);
                }

                if (localDestaque.eventos > 0) {
                    summaryParts.push(`📍 O local mais utilizado foi a(o) ${localDestaque.nome}, sediando ${localDestaque.eventos} eventos.`);
                }
                
                if (totalTransmissions > 0) {
                    const tv = input.transmissionReport.find(t => t.nome === 'TV Aberta')?.eventos || 0;
                    const youtube = input.transmissionReport.find(t => t.nome === 'YouTube')?.eventos || 0;
                    summaryParts.push(`📡 Quanto às transmissões, ${youtube} foram via YouTube e ${tv} via TV Aberta.`);
                }
            } else {
                summaryParts.push("Nenhum evento foi registrado no período selecionado. Não há dados para analisar.");
            }
            
            const resumoNarrativo = summaryParts.join(' ');
            
            return {
                resumoNarrativo: resumoNarrativo,
                destaques: {
                    operador: operadorDestaque,
                    local: localDestaque,
                }
            };
        }
    }
);
