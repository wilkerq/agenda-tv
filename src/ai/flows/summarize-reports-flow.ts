
'use server';
/**
 * @fileOverview A flow for summarizing event report data using pre-processing and local logic.
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
        const totalTransmissions = input.transmissionReport.reduce((acc, item) => acc + item.eventos, 0);

        // --- GERAÇÃO DE RESUMO COM LÓGICA LOCAL ---
        const summaryParts: string[] = [];
        summaryParts.push(`No período analisado, foram registrados um total de ${input.totalEvents} eventos.`);
        if (input.totalNightEvents > 0) {
            summaryParts.push(`${input.totalNightEvents} destes ocorreram no período noturno.`);
        }

        if (operadorDestaque.eventos > 0) {
            summaryParts.push(`O destaque de produtividade foi ${operadorDestaque.nome}, responsável por ${operadorDestaque.eventos} eventos.`);
        }

        if (localDestaque.eventos > 0) {
            summaryParts.push(`O local mais utilizado foi a(o) ${localDestaque.nome}, sediando ${localDestaque.eventos} eventos.`);
        }
        
        if (totalTransmissions > 0) {
            const tv = input.transmissionReport.find(t => t.nome === 'TV Aberta')?.eventos || 0;
            const youtube = input.transmissionReport.find(t => t.nome === 'YouTube')?.eventos || 0;
            summaryParts.push(`Quanto às transmissões, ${youtube} foram via YouTube e ${tv} via TV Aberta.`);
        }
        
        const resumoNarrativo = summaryParts.join(' ');
        
        // --- RETORNO ESTRUTURADO ---
        return {
            resumoNarrativo: resumoNarrativo,
            destaques: {
                operador: operadorDestaque,
                local: localDestaque,
            }
        };
    }
);
