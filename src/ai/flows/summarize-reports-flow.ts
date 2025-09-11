
'use server';
/**
 * @fileOverview A flow for summarizing event report data.
 *
 * - summarizeReports - A function that generates a summary for report data.
 * - ReportDataInput - The input type for the summarizeReports function.
 * - ReportSummaryOutput - The return type for the summarizeReports function.
 */

import { ai } from '@/ai/genkit';
import { 
    ReportDataInput, 
    ReportDataInputSchema, 
    ReportSummaryOutput, 
    ReportSummaryOutputSchema 
} from '@/lib/types';


export async function summarizeReports(input: ReportDataInput): Promise<ReportSummaryOutput> {
    return summarizeReportsFlow(input);
}


const prompt = ai.definePrompt({
    name: 'summarizeReportsPrompt',
    model: 'googleai/gemini-1.5-flash-preview',
    input: { schema: ReportDataInputSchema },
    output: { schema: ReportSummaryOutputSchema },
    prompt: `You are a data analyst for Alego's event management team. Your task is to provide a brief, insightful summary based on the following event data. The summary must be in Brazilian Portuguese.

    Focus on key takeaways. For example:
    - Who is the most active operator?
    - Are night events common?
    - Which location is most used?
    - Is there a dominant transmission medium?

    Keep the summary concise and to the point, like a paragraph in a report.

    Data:
    - Total Events: {{{totalEvents}}}
    - Total Night Events (after 6 PM): {{{totalNightEvents}}}
    
    Events per Operator:
    {{#each reportData}}
    - {{@key}}: {{this.count}} events ({{this.nightCount}} at night)
    {{/each}}

    Events per Location:
    {{#each locationReport}}
    - {{@key}}: {{this}} events
    {{/each}}

    Events per Transmission Type:
    - YouTube: {{{transmissionReport.youtube}}}
    - TV Aberta: {{{transmissionReport.tv}}}
    `,
});

const summarizeReportsFlow = ai.defineFlow(
    {
        name: 'summarizeReportsFlow',
        inputSchema: ReportDataInputSchema,
        outputSchema: ReportSummaryOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
