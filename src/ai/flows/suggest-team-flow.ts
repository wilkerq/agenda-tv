'use server';
/**
 * @fileOverview A flow for suggesting an event team using AI.
 * - suggestTeam - A function that suggests a team based on event details.
 */
import { ai } from '@/ai/genkit';
import { 
    SuggestTeamInput, 
    SuggestTeamInputSchema, 
    SuggestTeamOutput, 
    SuggestTeamOutputSchema,
} from '@/lib/types';
import { getScheduleTool } from '../tools/get-schedule-tool';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { getOperationMode } from '@/lib/state';
import { suggestTeam as suggestTeamWithLogic } from '@/lib/suggestion-logic';


// NOVO (Regra 1.1): Define um schema de input SÓ para a IA.
// A IA não deve receber 'eventsToday' ou 'allFutureEvents', ela deve usar a 'getScheduleTool'.
const AiSuggestTeamInputSchema = SuggestTeamInputSchema.omit({
    eventsToday: true,
    allFutureEvents: true,
});


// Main exported function
export async function suggestTeam(input: SuggestTeamInput): Promise<SuggestTeamOutput> {
    return suggestTeamFlow(input);
}


// MODIFICADO: Prompt da IA com regras de negócio complexas
const suggestTeamPrompt = ai.definePrompt({
    name: 'suggestTeamPrompt',
    model: 'googleai/gemini-1.5-pro', 
    tools: [getScheduleTool],
    // MODIFICADO: Usa o schema específico da IA
    input: { schema: AiSuggestTeamInputSchema }, 
    output: { schema: SuggestTeamOutputSchema },
    
    // MODIFICADO: System prompt completamente reescrito para incluir TODAS as regras.
    system: `Você é um gerente de produção sênior e especialista em logística da TV Alego. Sua tarefa é escalar a melhor equipe para um evento, seguindo regras de negócio ESTRICTAS.

OBJETIVOS PRINCIPAIS:
1.  **Evitar Conflitos (Regra 3):** Use a ferramenta \`getSchedule\` extensivamente. Verifique a agenda do 'date' fornecido para evitar escalar pessoas que já estão em outros eventos.
2.  **Limite de Carga (Regra 1):** Um evento dura em média 1 hora. Evite escalar a mesma pessoa para mais de 6 eventos no mesmo dia. Verifique a agenda com \`getSchedule\`.
3.  **Respeitar Turnos (Regra 2):** Use o 'Turno' (Manhã, Tarde, Noite, Geral) fornecido na lista de pessoal. 'Geral' pode cobrir qualquer turno.
4.  **Exceção de Turno (Viagem):** Ignore a regra de 'Turno' para eventos do tipo 'viagem'.
5.  **Cargos Híbridos (Regra 4):** Algumas pessoas são 'Repórter' e 'Produtor'. Não escale a MESMA pessoa para duas funções diferentes se os eventos tiverem sobreposição de horário (verifique com \`getSchedule\`).

REGRAS DE ESCALAÇÃO DE OPERADOR DE TRANSMISSÃO (Regra 8):
-   **"Deputados Aqui" (Regra 6):** Se o nome do evento contiver "Deputados Aqui", o Operador DEVE ser "Wilker Quirino".
-   **"CCJR":** Se o local for "Sala Julio da Retifica \"CCJR\"", o Operador DEVE ser "Mário Augusto".
-   **Fim de Semana:** Se a data for um Sábado ou Domingo, faça um rodízio APENAS entre "Bruno Almeida", "Mário Augusto" e "Ovídio Dias" (use \`getSchedule\` para ver quem está mais livre).
-   **Turno da Noite (18:00+):** O padrão é "Bruno Almeida". Se ele já estiver em outro evento à noite (verifique \`getSchedule\`), escale "Mário Augusto".
-   **Outros Casos:** Use a lógica genérica (Turno + Carga).

REGRAS DE ESCALAÇÃO DE REPÓRTER CINEMATOGRÁFICO (Regra 9):
-   **Turno da Noite (18:00+):** Faça um rodízio APENAS com pessoal do turno da 'Tarde' (use \`getSchedule\` para ver quem está mais livre).
-   **Outros Casos:** Use a lógica genérica (Turno + Carga).

REGRAS DE ESCALAÇÃO DE REPÓRTER (Regra 10):
-   **Turno da Noite (18:00+):** Faça um rodízio APENAS com pessoal do turno da 'Tarde' ou 'Geral' (use \`getSchedule\` para ver quem está mais livre).
-   **Outros Casos:** Use a lógica genérica (Turno + Carga).

REGRAS DE VIAGEM (Regras 5 & 7):
-   **Fairness (Regra 5):** Para 'viagem', priorize pessoal que viajou menos recentemente (você não tem o histórico de dias, então use o \`getSchedule\` para ver quem está mais livre de viagens futuras).
-   **Conflitos (Regra 7):** Se sua escolha IDEAL para uma 'viagem' já estiver escalada para um evento LOCAL (não-viagem) no mesmo período (verifique \`getSchedule\`), faça o seguinte:
    1.  Escale a pessoa ideal para a 'viagem' (a viagem tem prioridade).
    2.  Adicione um item ao array \`reschedulingSuggestions\` no output.
    3.  Nesse item, sugira um 'suggestedReplacement' (substituto) para o evento LOCAL que entrou em conflito.

Use APENAS pessoal das listas fornecidas. Tente preencher todas as funções.`,
    
    prompt: `
        Evento:
        - Nome: {{{name}}}
        - Local: {{{location}}}
        - Data: {{{date}}}
        - Hora: {{{time}}}
        - Tipos: {{#each transmissionTypes}}{{{this}}}{{/each}}
        - Partida (Viagem): {{{departure}}}
        - Chegada (Viagem): {{{arrival}}}

        Listas de Pessoal Disponível:
        
        Operadores:
        {{#each operators}}
        - {{{this.name}}} (Turno: {{{this.turn}}})
        {{else}}
        - Nenhum disponível
        {{/each}}

        Repórteres Cinematográficos:
        {{#each cinematographicReporters}}
        - {{{this.name}}} (Turno: {{{this.turn}}})
        {{else}}
        - Nenhum disponível
        {{/each}}

        Repórteres:
        {{#each reporters}}
        - {{{this.name}}} (Turno: {{{this.turn}}})
        {{else}}
        - Nenhum disponível
        {{/each}}

        Produtores:
        {{#each producers}}
        - {{{this.name}}} (Turno: {{{this.turn}}})
        {{else}}
        - Nenhum disponível
        {{/each}}
    `,
});


// Define o fluxo principal (MODIFICADO)
const suggestTeamFlow = ai.defineFlow(
    {
        name: 'suggestTeamFlow',
        inputSchema: SuggestTeamInputSchema,
        outputSchema: SuggestTeamOutputSchema,
    },
    async (input) => {
        const mode = await getOperationMode();
        const eventDate = parseISO(input.date);

        if (mode === 'ai') {
            // --- MODO IA ---
            
            // MODIFICADO: Separa o input. Não envia dados do modo 'logic' para a IA.
            const { 
                eventsToday, 
                allFutureEvents, 
                ...aiInput 
            } = input;
            
            const { output } = await suggestTeamPrompt({
                ...aiInput, // Passa apenas os dados relevantes para a IA
                date: format(eventDate, 'yyyy-MM-dd'), // Formata a data para a ferramenta
            });

            return output || {};

        } else {
            // --- MODO LÓGICA ---
            // Os dados já foram buscados no cliente (add-event-form.tsx)
            // Apenas chama a função de lógica pura com o input completo.
            const result = await suggestTeamWithLogic({
                ...input,
                // input já contém eventsToday e allFutureEvents
            });
            
            return result;
        }
    }
);
