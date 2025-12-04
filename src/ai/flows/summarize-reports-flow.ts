'use server';
/**
 * @fileOverview A flow for summarizing event report data. Can use AI or local logic.
 *
 * - summarizeReports - A function that generates a summary for report data.
 */

import { generateObject } from 'ai';
import { aiModel } from '@/lib/ai';
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

// Main exported function
export async function summarizeReports(input: ReportDataInput, mode: 'ai' | 'logic'): Promise<ReportSummaryOutput> {
    const validatedInput = ReportDataInputSchema.parse(input);

    if (mode === 'ai') {
        const { object } = await generateObject({
            model: aiModel,
            schema: ReportSummaryOutputSchema,
            prompt: `You are an expert data analyst for a TV station. Your task is to provide a concise, insightful, and narrative summary based on the provided event data. Your summary must be in Brazilian Portuguese.

            Data Provided:
            - Total Events: ${validatedInput.totalEvents}
            - Total Night Events (after 6 PM): ${validatedInput.totalNightEvents}
            - Performance by Operator: ${JSON.stringify(validatedInput.reportData)}
            - Events by Location: ${JSON.stringify(validatedInput.locationReport)}
            - Events by Transmission Type: ${JSON.stringify(validatedInput.transmissionReport)}

            Based on this data, generate a "resumoNarrativo" (narrative summary) and identify the "destaques" (highlights) for the operator and location with the most events.

            The summary should be a fluid paragraph, not just a list of stats. Highlight key trends, like the percentage of night events or standout performers.
            Example Tone: "No período analisado, a equipe realizou X eventos, com um número expressivo de Y (Z%) ocorrendo no período noturno, indicando uma alta demanda de cobertura à noite. O destaque de produtividade foi [Nome], com [N] eventos. O local mais frequentado foi [Local], com [M] eventos."
            `,
        });
        return object;

    } else {
        // --- LOGIC MODE ---
        const operadorDestaque = encontrarDestaque(validatedInput.reportData);
        const localDestaque = encontrarDestaque(validatedInput.locationReport);
        const totalTransmissions = validatedInput.transmissionReport.reduce((acc, item) => acc + item.eventos, 0);

        const summaryParts: string[] = [];

        if (validatedInput.totalEvents > 0) {
            summaryParts.push(`📊 No período analisado, um total de ${validatedInput.totalEvents} eventos foram registrados.`);
            
            if (validatedInput.totalNightEvents > 0) {
                const nightPercentage = ((validatedInput.totalNightEvents / validatedInput.totalEvents) * 100).toFixed(1);
                summaryParts.push(`🌙 ${validatedInput.totalNightEvents} (${nightPercentage}%) destes ocorreram no período noturno, mostrando uma atividade significativa após as 18h.`);
            }

            if (operadorDestaque.eventos > 0) {
                const productivityPercentage = ((operadorDestaque.eventos / validatedInput.totalEvents) * 100).toFixed(1);
                summaryParts.push(`🏆 O destaque de produtividade foi ${operadorDestaque.nome}, responsável por ${operadorDestaque.eventos} eventos, o que representa ${productivityPercentage}% do total.`);
            }

            if (localDestaque.eventos > 0) {
                summaryParts.push(`📍 O local mais utilizado foi a(o) ${localDestaque.nome}, sediando ${localDestaque.eventos} eventos.`);
            }
            
            if (totalTransmissions > 0) {
                const tv = validatedInput.transmissionReport.find(t => t.nome === 'TV Aberta')?.eventos || 0;
                const youtube = validatedInput.transmissionReport.find(t => t.nome === 'YouTube')?.eventos || 0;
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
