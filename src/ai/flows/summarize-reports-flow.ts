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
    // Returning a placeholder as AI is disabled for this flow
    return { summary: "A geração de resumo por IA está temporariamente desativada. Verifique os dados manualmente." };
}

const summarizeReportsFlow = ai.defineFlow(
    {
        name: 'summarizeReportsFlow',
        inputSchema: ReportDataInputSchema,
        outputSchema: ReportSummaryOutputSchema,
    },
    async (input) => {
        
        // Returning a placeholder as AI is disabled.
        return { summary: "A geração de resumo por IA está temporariamente desativada." };
        
    }
);
