
'use server';
/**
 * @fileOverview A flow for suggesting an event operator based on scheduling rules.
 *
 * - suggestOperator - A function that suggests an operator based on event details.
 */

import { ai } from '@/ai/genkit';
import { getEventsForDay } from '@/lib/tools';
import { 
    SuggestOperatorInput, 
    SuggestOperatorInputSchema, 
    SuggestOperatorOutput, 
    SuggestOperatorOutputSchema 
} from '@/lib/types';


export async function suggestOperator(input: SuggestOperatorInput): Promise<SuggestOperatorOutput> {
    return suggestOperatorFlow(input);
}


const prompt = ai.definePrompt({
    name: 'suggestOperatorPrompt',
    model: 'googleai/gemini-2.5-flash-lite',
    input: { schema: SuggestOperatorInputSchema },
    output: { schema: SuggestOperatorOutputSchema },
    tools: [getEventsForDay],
    prompt: `Você é um especialista em agendamento da Alego. Sua tarefa é determinar o melhor operador para um evento, seguindo regras hierárquicas. O ano atual é ${new Date().getFullYear()}.

**PROCESSO OBRIGATÓRIO:**

1.  **Consultar Agenda (Passo 1):**
    *   Primeiro, use a ferramenta \`getEventsForDay\` para obter a lista de eventos já agendados para a data fornecida. Isso é essencial para o contexto.

2.  **Aplicar Regras de Atribuição (Passo 2):**
    *   Com base no resultado da ferramenta e nos detalhes do evento, aplique a seguinte hierarquia de regras. A primeira regra que corresponder determina o operador.
    *   Após determinar o operador, seu único trabalho é retornar o nome dele no campo 'operator'. **NÃO chame mais nenhuma ferramenta.**

**HIERARQUIA DE REGRAS:**

*   **Regra 1: Local Específico (Prioridade Máxima)**
    *   Se o local for "Sala Julio da Retifica \"CCJR\"", o operador DEVE ser "Mário Augusto".

*   **Regra 2: Rotação de Fim de Semana (Sábado e Domingo)**
    *   Se o evento for em um fim de semana, use o resultado da ferramenta \`getEventsForDay\` para ver quem trabalhou no último evento de fim de semana e atribua um operador **diferente** do grupo principal: ["Bruno Michel", "Mário Augusto", "Ovidio Dias"].

*   **Regra 3: Turnos da Semana (Segunda a Sexta)**
    *   **Manhã (00:00 - 12:00):**
        *   O operador padrão é "Rodrigo Sousa".
        *   Se já houver outro evento pela manhã (verificado com a ferramenta), você DEVE atribuir um destes: "Wilker Quirino", "Ovidio Dias" ou "Mário Augusto".
    *   **Tarde (12:01 - 18:00):**
        *   O operador DEVE ser um destes: "Ovidio Dias", "Mário Augusto" ou "Bruno Michel". Faça um rodízio com base nos eventos já agendados.
    *   **Noite (após as 18:00):**
        *   O operador padrão é "Bruno Michel".
        *   Se já houver outro evento à noite (verificado com a ferramenta), você DEVE atribuir "Ovidio Dias" ou "Mário Augusto".

**Detalhes do Evento para Análise:**
- **Data e Hora:** {{{date}}}
- **Local:** {{{location}}}

Sua saída final deve ser um objeto JSON contendo apenas o campo "operator".
`,
});

const suggestOperatorFlow = ai.defineFlow(
    {
        name: 'suggestOperatorFlow',
        inputSchema: SuggestOperatorInputSchema,
        outputSchema: SuggestOperatorOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
