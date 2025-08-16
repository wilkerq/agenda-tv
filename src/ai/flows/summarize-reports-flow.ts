
'use server';
/**
 * @fileOverview A flow for summarizing event report data.
 *
 * - summarizeReports - A function that generates a summary for report data.
 * - ReportDataInput - The input type for the summarizeReports function.
 * - ReportSummaryOutput - The return type for the summarizeReports function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const OperatorReportSchema = z.object({
  count: z.number(),
  nightCount: z.number(),
});

const TransmissionReportSchema = z.object({
  youtube: z.number(),
  tv: z.number(),
});

export const ReportDataInputSchema = z.object({
  totalEvents: z.number().describe('The total number of events.'),
  totalNightEvents: z.number().describe('The total number of events happening at or after 6 PM.'),
  reportData: z.record(z.string(), OperatorReportSchema).describe('A map of operator names to their event counts.'),
  locationReport: z.record(z.string(), z.number()).describe('A map of locations to their event counts.'),
  transmissionReport: TransmissionReportSchema.describe('A report of event counts by transmission type (YouTube vs. TV).'),
});
export type ReportDataInput = z.infer<typeof ReportDataInputSchema>;


export const ReportSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise, data-driven summary of the reports in portuguese.'),
});
export type ReportSummaryOutput = z.infer<typeof ReportSummaryOutputSchema>;


export async function summarizeReports(input: ReportDataInput): Promise<ReportSummaryOutput> {
    return summarizeReportsFlow(input);
}


const prompt = ai.definePrompt({
    name: 'summarizeReportsPrompt',
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
