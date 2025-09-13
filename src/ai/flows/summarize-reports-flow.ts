
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
    model: 'googleai/gemini-2.5-flash-lite',
    input: { schema: ReportDataInputSchema },
    output: { schema: ReportSummaryOutputSchema },
    prompt: `Você é um analista de dados da equipe de gestão de eventos da Alego.
Sua tarefa é gerar um resumo executivo em um único parágrafo, baseado nos dados fornecidos. O resumo deve ser em português do Brasil.

**FOCO DA ANÁLISE:**
Concentre-se em extrair os principais insights dos dados. Responda a perguntas como:
- Quem é o operador mais ativo? E o menos ativo?
- Eventos noturnos são uma ocorrência comum ou rara?
- Qual local é o mais utilizado? Existe algum local subutilizado?
- Qual é o meio de transmissão dominante (YouTube vs. TV Aberta)?

Seja conciso, direto e baseie todas as afirmações nos dados.

**DADOS PARA ANÁLISE:**
- Total de Eventos Registrados: {{{totalEvents}}}
- Total de Eventos Noturnos (após as 18h): {{{totalNightEvents}}}
    
- **Relatório por Operador:**
{{#each reportData}}
  - {{@key}}: {{this.count}} eventos ({{this.nightCount}} à noite)
{{/each}}

- **Relatório por Local:**
{{#each locationReport}}
  - {{@key}}: {{this}} eventos
{{/each}}

- **Relatório por Transmissão:**
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
