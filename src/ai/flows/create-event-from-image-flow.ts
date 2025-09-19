
'use server';
/**
 * @fileOverview A flow for creating an event from an image using AI.
 *
 * - createEventFromImage - A function that extracts event details from an image.
 */

import { ai } from '@/ai/genkit';
import { 
    CreateEventFromImageInput, 
    CreateEventFromImageInputSchema, 
    CreateEventFromImageOutput, 
    CreateEventFromImageOutputSchema 
} from '@/lib/types';


export async function createEventFromImage(input: CreateEventFromImageInput): Promise<CreateEventFromImageOutput> {
    return createEventFromImageFlow(input);
}


const prompt = ai.definePrompt({
    name: 'createEventFromImagePrompt',
    model: 'googleai/gemini-2.5-flash-lite',
    input: { schema: CreateEventFromImageInputSchema },
    output: { schema: CreateEventFromImageOutputSchema },
    prompt: `Você é um robô de automação para a Assembleia Legislativa de Goiás (Alego). Sua única função é extrair detalhes de uma imagem de evento e aplicar um conjunto de regras de negócio fixas para preencher um formulário. O ano atual é 2024. Sua saída DEVE estar em conformidade com o esquema JSON.

**PROCESSO OBRIGATÓRIO EM DUAS ETAPAS:**

**Etapa 1: Extração de Dados da Imagem**
Primeiro, analise a imagem para extrair os seguintes dados brutos.

1.  **Nome do Evento (name):** Extraia o nome completo e detalhado do evento.
2.  **Local (location):** Extraia o local específico (ex: "Plenário Iris Rezende Machado", "Auditório Carlos Vieira"). Se o nome de um edifício for fornecido, infira o salão mais importante dentro dele.
3.  **Data (date):** Extraia a data do evento da imagem. Formate-a como 'AAAA-MM-DD'.
4.  **Hora (time):** Extraia a hora do evento da imagem. Formate-a como 'HH:mm'. Se você não conseguir encontrar uma hora específica, DEVE retornar \`null\` para este campo. Não invente uma hora.

**Etapa 2: Aplicação das Regras de Negócio (Lógica Obrigatória)**
Depois de extrair os dados, aplique as seguintes regras para preencher os campos restantes. ESTAS REGRAS SÃO ABSOLUTAS E DEVEM SER SEGUIDAS.

1.  **Regra de Transmissão (transmission):**
    *   Se o local extraído for "Plenário Iris Rezende Machado", você DEVE definir a transmissão como "tv".
    *   Para TODOS os outros locais, você DEVE definir a transmissão como "youtube".

2.  **Regra de Atribuição de Operador (operator):**
    *   Você DEVE atribuir um operador seguindo esta hierarquia. A primeira regra que corresponder determina o operador.

    *   **Regra 1: Local Específico (Prioridade Máxima)**
        *   Se o local for "Sala Julio da Retifica \"CCJR\"", o operador DEVE ser "Mário Augusto".

    *   **Regra 2: Turnos Durante a Semana (Lógica Padrão)**
        *   **Manhã (00:00 - 12:00):** O operador padrão é "Rodrigo Sousa".
        *   **Tarde (12:01 - 18:00):** O operador DEVE ser um dos seguintes: "Ovidio Dias", "Mário Augusto" ou "Bruno Michel". Escolha um aleatoriamente.
        *   **Noite (após 18:00):** O operador padrão é "Bruno Michel".

**Imagem para Análise:**
{{media url=photoDataUri}}
`,
});

const createEventFromImageFlow = ai.defineFlow(
    {
        name: 'createEventFromImageFlow',
        inputSchema: CreateEventFromImageInputSchema,
        outputSchema: CreateEventFromImageOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
