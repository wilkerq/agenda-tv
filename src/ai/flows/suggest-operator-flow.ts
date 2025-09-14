
'use server';
/**
 * @fileOverview A flow for suggesting an event operator based on scheduling rules.
 *
 * - suggestOperator - A function that suggests an operator based on event details.
 */

import { ai } from '@/ai/genkit';
import { getEventsForDay } from '@/lib/tools';
import { 
    SuggestOperatorInput as OriginalSuggestOperatorInput,
    SuggestOperatorOutput,
    SuggestOperatorOutputSchema 
} from '@/lib/types';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { z } from 'zod';

// Extend the input to include the list of available operators
const SuggestOperatorInputSchema = z.object({
  date: z.string().describe("The full date and time of the event in ISO 8601 format."),
  location: z.string().describe("The venue or place where the event will occur."),
  availableOperators: z.array(z.string()).describe("A list of all available operator names to choose from."),
});
export type SuggestOperatorInput = z.infer<typeof SuggestOperatorInputSchema>;


export async function suggestOperator(input: OriginalSuggestOperatorInput): Promise<SuggestOperatorOutput> {
    return suggestOperatorFlow(input);
}


const prompt = ai.definePrompt({
    name: 'suggestOperatorPrompt',
    model: 'googleai/gemini-pro',
    input: { schema: SuggestOperatorInputSchema },
    output: { schema: SuggestOperatorOutputSchema },
    tools: [getEventsForDay],
    prompt: `Você é um assistente especialista em agendamento da Alego. Sua tarefa é determinar o operador mais adequado para um evento, usando a lista de operadores disponíveis e seguindo uma hierarquia de regras. O ano atual é 2024.

**OPERADORES DISPONÍVEIS:**
{{#each availableOperators}}
- {{{this}}}
{{/each}}

**PROCESSO OBRIGATÓRIO:**

1.  **Consultar Agenda (Passo 1):**
    *   Primeiro, use a ferramenta \`getEventsForDay\` para obter a lista de eventos já agendados para a data fornecida. Isso é essencial para o contexto.

2.  **Aplicar Regras de Atribuição (Passo 2):**
    *   Com base no resultado da ferramenta e nos detalhes do evento, aplique a seguinte hierarquia de regras. A primeira regra que corresponder determina o operador.
    *   Você DEVE escolher um operador da lista de "OPERADORES DISPONÍVEIS".
    *   Após determinar o operador, seu único trabalho é retornar o nome dele no campo 'operator'. **NÃO chame mais nenhuma ferramenta.**

**HIERARQUIA DE REGRAS:**

*   **Regra 1: Local Específico (Prioridade Máxima)**
    *   Se o local for "Sala Julio da Retifica \"CCJR\"", o operador DEVE ser "Mário Augusto" (se ele estiver na lista de disponíveis).

*   **Regra 2: Rotação de Fim de Semana (Sábado e Domingo)**
    *   Se o evento for em um fim de semana, use o resultado da ferramenta \`getEventsForDay\` para ver quem trabalhou no último evento de fim de semana e atribua um operador **diferente** da lista de disponíveis.

*   **Regra 3: Turnos da Semana (Segunda a Sexta)**
    *   **Manhã (00:00 - 12:00):**
        *   O operador padrão é "Rodrigo Sousa" (se disponível).
        *   Se já houver outro evento pela manhã (verificado com a ferramenta), você DEVE atribuir outro operador da lista de disponíveis.
    *   **Tarde (12:01 - 18:00):**
        *   Faça um rodízio entre os operadores da lista de disponíveis, considerando os eventos já agendados.
    *   **Noite (após as 18:00):**
        *   O operador padrão é "Bruno Michel" (se disponível).
        *   Se já houver outro evento à noite (verificado com a ferramenta), você DEVE atribuir outro operador da lista.

**Detalhes do Evento para Análise:**
- **Data e Hora:** {{{date}}}
- **Local:** {{{location}}}

Sua saída final deve ser um objeto JSON contendo apenas o campo "operator".
`,
});

const suggestOperatorFlow = ai.defineFlow(
    {
        name: 'suggestOperatorFlow',
        inputSchema: z.object({
          date: z.string(),
          location: z.string(),
        }),
        outputSchema: SuggestOperatorOutputSchema,
    },
    async (input) => {
        // 1. Fetch operators from Firestore
        const operatorsCollection = collection(db, 'operators');
        const operatorsSnapshot = await getDocs(query(operatorsCollection));
        const availableOperators = operatorsSnapshot.docs.map(doc => doc.data().name as string);

        if (availableOperators.length === 0) {
            console.warn("No operators found in the database. Cannot suggest an operator.");
            return { operator: undefined };
        }
        
        // 2. Call the prompt with the dynamic list of operators
        const { output } = await prompt({
            ...input,
            availableOperators,
        });

        return output!;
    }
);
