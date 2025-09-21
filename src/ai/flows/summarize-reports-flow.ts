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


export async function summarizeReports(input: ReportDataInput): Promise<ReportSummaryOutput> {
    return summarizeReportsFlow(input);
}


const prompt = ai.definePrompt({
    name: 'summarizeReportsPrompt',
    model: 'gemini-2.5-flash-image-preview',
    input: { schema: ReportDataInputSchema },
    output: { schema: ReportSummaryOutputSchema },
    prompt: `You are an expert data analyst for the Alego event management team. Your task is to generate a concise, single-paragraph executive summary based on the provided data. The summary MUST be in Brazilian Portuguese.

**MANDATORY ANALYSIS RULES:**
1.  **Focus on Key Insights:** Concentrate on extracting the most important insights from the data. Answer questions like:
    *   Who is the most and least active operator?
    *   Are night events common or rare?
    *   Which location is most used? Are any locations underutilized?
    *   What is the dominant transmission medium (YouTube vs. TV)?
2.  **Data-Driven Language:** Be concise, direct, and base ALL claims strictly on the provided data. Do not make up information.

**DATA FOR ANALYSIS:**
- Total Registered Events: {{{totalEvents}}}
- Total Night Events (after 6 PM): {{{totalNightEvents}}}
    
- **Report by Operator:**
{{#each reportData}}
  - {{@key}}: {{this.count}} events ({{this.nightCount}} at night)
{{/each}}

- **Report by Location:**
{{#each locationReport}}
  - {{@key}}: {{this}} events
{{/each}}

- **Report by Transmission:**
  - YouTube: {{{transmissionReport.youtube}}}
  - TV: {{{transmissionReport.tv}}}
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
