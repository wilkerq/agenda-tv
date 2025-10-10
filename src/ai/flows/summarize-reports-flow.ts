
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
        
        // AI Call Disabled to prevent 404 errors. Returning a default summary.
        console.warn("AI call in summarizeReportsFlow is disabled. Returning default summary.");

        const summary = {
            summary: `No período, foram registrados ${input.totalEvents} eventos. A funcionalidade de resumo por IA está temporariamente usando uma resposta padrão para evitar erros de conexão.`
        };
        
        ReportSummaryOutputSchema.parse(summary);

        return summary;
    }
);
