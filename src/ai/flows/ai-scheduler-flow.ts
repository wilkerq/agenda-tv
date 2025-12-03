
'use server';
/**
 * @fileOverview A Genkit flow that uses AI to suggest a full team for an event.
 * This acts as a fallback when the deterministic logic fails.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { EventInput, Personnel, SuggestTeamFlowOutput, RoleKey } from '@/lib/types';
import { isSameDayInTimezone, determineShiftFromDate } from '@/engine/schedule.utils';

// Define o schema de entrada para o fluxo de IA
const AISchedulerInputSchema = z.object({
  event: z.object({
    name: z.string(),
    date: z.string(),
    location: z.string(),
  }),
  pools: z.object({
    transmissionOps: z.array(z.any()),
    cinematographicReporters: z.array(z.any()),
    reporters: z.array(z.any()),
    producers: z.array(z.any()),
  }),
  allEvents: z.array(z.any()),
});

// Define o schema de saída para o fluxo de IA
const AISchedulerOutputSchema = z.object({
  transmissionOperator: z.string().nullable().describe("O nome do operador de transmissão sugerido."),
  cinematographicReporter: z.string().nullable().describe("O nome do repórter cinematográfico sugerido."),
  reporter: z.string().nullable().describe("O nome do repórter sugerido."),
  producer: z.string().nullable().describe("O nome do produtor sugerido."),
  reasoning: z.string().describe("A justificativa em português para a escolha da equipe, explicando brevemente porque cada membro é uma boa escolha (turno, carga horária, etc)."),
});

// Cria o prompt do Genkit
const schedulePrompt = ai.definePrompt({
  name: 'aiSchedulerPrompt',
  model: 'ollama/llama3:latest',
  input: { schema: AISchedulerInputSchema },
  output: { schema: AISchedulerOutputSchema },
  prompt: `Você é um gerente de produção sênior para uma estação de TV, especialista em escalar equipes de forma eficiente. Sua tarefa é escalar a melhor equipe possível para um novo evento, considerando o turno, a carga de trabalho e a disponibilidade.

Analise os dados fornecidos:
1.  **Novo Evento**: Detalhes do evento a ser escalado.
2.  **Pools de Pessoal**: As listas de todos os profissionais disponíveis para cada função.
3.  **Eventos Existentes**: A lista de todos os outros eventos já agendados.

Seu objetivo é preencher as quatro funções (Operador de Transmissão, Repórter Cinematográfico, Repórter, Produtor) com os melhores candidatos.

**Regras de Prioridade:**
1.  **EVITAR CONFLITOS:** Um profissional NÃO PODE ser escalado se já estiver em outro evento no mesmo dia e horário.
2.  **RESPEITAR O TURNO:** Dê alta prioridade a profissionais cujo turno de trabalho (Manhã, Tarde, Noite) corresponde ao turno do evento. Profissionais com turno 'Geral' são flexíveis.
3.  **DISTRIBUIR CARGA:** Prefira profissionais que tenham menos eventos no dia. Evite sobrecarregar a mesma pessoa.
4.  **SEMPRE SUGIRA ALGUÉM:** Se não houver um candidato perfeito, escolha o "menos pior" (ex: alguém de turno 'Geral' ou com menos trabalho, mesmo que seja de outro turno). É melhor ter uma sugestão do que nenhuma.

**Formato de Saída:**
Retorne um objeto JSON com os nomes dos profissionais para cada função e uma breve justificativa para sua escolha.

**Dados de Entrada:**
- **Novo Evento:** {{json event}}
- **Operadores Disponíveis:** {{json pools.transmissionOps}}
- **Rep. Cinematográficos Disponíveis:** {{json pools.cinematographicReporters}}
- **Repórteres Disponíveis:** {{json pools.reporters}}
- **Produtores Disponíveis:** {{json pools.producers}}
- **Agenda Atual (Outros Eventos):** {{json allEvents}}
`,
});


// Define o fluxo do Genkit
const aiSchedulerFlow = ai.defineFlow(
  {
    name: 'aiSchedulerFlow',
    inputSchema: AISchedulerInputSchema,
    outputSchema: AISchedulerOutputSchema,
  },
  async (input) => {
    // Simplifica os dados dos eventos existentes para economizar tokens
    const simplifiedEvents = input.allEvents.map((e: any) => ({
      name: e.name,
      date: e.date,
      location: e.location,
      team: [e.transmissionOperator, e.cinematographicReporter, e.reporter, e.producer].filter(Boolean),
    }));

    const { output } = await schedulePrompt({
        ...input,
        allEvents: simplifiedEvents
    });
    
    return output!;
  }
);


// Função wrapper exportada para ser chamada pelo `suggestTeam`
export async function scheduleWithAI(params: {
    event: EventInput;
    pools: {
        transmissionOps: Personnel[];
        cinematographicReporters: Personnel[];
        reporters: Personnel[];
        producers: Personnel[];
    };
    allEvents: EventInput[];
}): Promise<SuggestTeamFlowOutput> {
    
    const eventForAI = {
        name: params.event.name,
        date: params.event.date.toISOString(),
        location: params.event.location,
    };

    const result = await aiSchedulerFlow({
        event: eventForAI,
        pools: params.pools,
        allEvents: params.allEvents,
    });

    console.log("AI Suggestion Reason:", result.reasoning);

    return {
        transmissionOperator: result.transmissionOperator,
        cinematographicReporter: result.cinematographicReporter,
        reporter: result.reporter,
        producer: result.producer,
    };
}
