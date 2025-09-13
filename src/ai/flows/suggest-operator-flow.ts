
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
    prompt: `Você é um especialista em agendamento de eventos para a Assembleia Legislativa de Goiás (Alego). Sua tarefa é determinar o melhor operador para um evento e retornar o nome dele no campo 'operator' da saída. Você deve seguir um conjunto estrito de regras hierárquicas. O ano atual é ${new Date().getFullYear()}.

**Processo Passo a Passo:**

1.  **Verificar Agenda Existente:**
    *   Você recebe a data e a hora do evento. Você DEVE chamar a ferramenta \`getEventsForDay\` para ver se outros eventos já estão agendados para aquele dia. Este é um primeiro passo obrigatório para obter contexto.

2.  **Aplicar Regras de Atribuição:**
    *   Com base no contexto da ferramenta e nos dados de entrada, você DEVE aplicar a seguinte hierarquia de regras. A primeira regra que corresponder determina o operador.
    *   Após determinar o operador, seu único trabalho é retornar o nome dele no campo 'operator' da saída. **Não chame nenhuma outra ferramenta.**

    *   **Regra 1: Local Específico (Prioridade Máxima)**
        *   Se o local for "Sala Julio da Retifica \"CCJR\"", o operador DEVE ser "Mário Augusto", independentemente de qualquer outra regra.

    *   **Regra 2: Rotação de Fim de Semana**
        *   Se o evento for em um sábado ou domingo, você DEVE implementar uma rotação. Use o resultado da ferramenta \`getEventsForDay\` para ver quem trabalhou no último evento de fim de semana e atribua um operador diferente do grupo principal: ["Bruno Michel", "Mário Augusto", "Ovidio Dias"].

    *   **Regra 3: Turnos da Semana (Lógica Padrão)**
        *   A hora do evento é fornecida no campo de entrada 'date'.
        *   **Manhã (00:00 - 12:00):**
            *   O operador padrão é "Rodrigo Sousa".
            *   Se a chamada da ferramenta mostrar outro evento já pela manhã, você DEVE atribuir "Wilker Quirino", "Ovidio Dias" ou "Mário Augusto".
        *   **Tarde (12:01 - 18:00):**
            *   O operador DEVE ser um dos seguintes: "Ovidio Dias", "Mário Augusto" ou "Bruno Michel". Escolha um.
        *   **Noite (após as 18:00):**
            *   O operador padrão é "Bruno Michel".
            *   Se a chamada da ferramenta mostrar outro evento já à noite, você DEVE atribuir "Ovidio Dias" ou "Mário Augusto".

**Detalhes do Evento de Entrada:**
- **Data e Hora:** {{{date}}}
- **Local:** {{{location}}}

Sua saída final deve ser um objeto JSON apenas com o campo "operator" preenchido com o nome que você determinou.
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
