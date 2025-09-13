
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
    model: 'googleai/gemini-2.5-flash-lite',
    input: { schema: ReportDataInputSchema },
    output: { schema: ReportSummaryOutputSchema },
    prompt: `Você é um analista de dados da equipe de gerenciamento de eventos da Alego. Sua tarefa é fornecer um resumo breve e perspicaz com base nos seguintes dados de eventos. O resumo deve estar em português do Brasil.

    Concentre-se nos principais pontos. Por exemplo:
    - Quem é o operador mais ativo?
    - Eventos noturnos são comuns?
    - Qual local é mais utilizado?
    - Existe um meio de transmissão dominante?

    Mantenha o resumo conciso e direto ao ponto, como um parágrafo em um relatório.

    Dados:
    - Total de Eventos: {{{totalEvents}}}
    - Total de Eventos Noturnos (após as 18h): {{{totalNightEvents}}}
    
    Eventos por Operador:
    {{#each reportData}}
    - {{@key}}: {{this.count}} eventos ({{this.nightCount}} à noite)
    {{/each}}

    Eventos por Local:
    {{#each locationReport}}
    - {{@key}}: {{this}} eventos
    {{/each}}

    Eventos por Tipo de Transmissão:
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
