
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
    model: 'googleai/gemini-pro',
    input: { schema: CreateEventFromImageInputSchema },
    output: { schema: CreateEventFromImageOutputSchema },
    prompt: `Você é um agendador de eventos de alta precisão para a Assembleia Legislativa de Goiás (Alego). Sua tarefa é extrair detalhes de um evento a partir de uma imagem e, em seguida, aplicar regras de negócio para completar o agendamento. O ano atual é 2024.

Sua saída final deve estar em conformidade com o esquema JSON especificado.

**Parte 1: Extração de Dados**

Primeiro, analise a imagem e a descrição do usuário para extrair os detalhes brutos do evento.

1.  **Nome do Evento (name):** Extraia o nome completo e detalhado do evento. Procure por uma descrição detalhada, frequentemente sob títulos como "Em pauta". Por exemplo, extraia "Sessão Solene de Homenagem aos Contadores" em vez de apenas "Sessão Solene".
2.  **Local (location):** Extraia o local específico (ex: "Plenário Iris Rezende Machado"). Se o nome de um edifício for fornecido, infira o salão mais importante dentro dele.
3.  **Data (date):** Você DEVE extrair tanto a data quanto a hora da imagem. Combine-os em uma única string no formato ISO 8601 ('AAAA-MM-DDTHH:mm:ss.sssZ'). Se você não conseguir encontrar uma hora específica na imagem, DEVE retornar \`null\` para este campo. Não invente uma hora.

**Parte 2: Lógica de Negócios e Formatação Final do JSON**

Após extrair os dados, você aplicará as seguintes regras de negócio e formatará a saída final.

1.  **Determinar Tipo de Transmissão (transmission):**
    *   Esta é uma regra obrigatória baseada no nome do evento.
    *   Se o nome do evento contiver "Sessão" ou "Comissão", você DEVE definir a transmissão como "tv".
    *   Para TODOS os outros eventos (ex: "Audiência Pública"), você DEVE definir a transmissão como "youtube".
    *   Apenas uma instrução explícita do usuário (ex: "transmitir na tv") pode anular esta regra.

2.  **Atribuir Operador (operator):**
    *   Você DEVE atribuir um operador com base na seguinte hierarquia de regras. A primeira regra que corresponder determina o operador.

    *   **Regra 1: Local Específico (Prioridade Máxima)**
        *   Se o local for "Sala Julio da Retifica \"CCJR\"", o operador DEVE ser "Mário Augusto", independentemente de qualquer outra regra.

    *   **Regra 2: Turnos Durante a Semana (Lógica Padrão)**
        *   **Manhã (00:00 - 12:00):**
            *   O operador padrão é "Rodrigo Sousa".
        *   **Tarde (12:01 - 18:00):**
            *   O operador DEVE ser um dos seguintes: "Ovidio Dias", "Mário Augusto" ou "Bruno Michel". Escolha um.
        *   **Noite (após 18:00):**
            *   O operador padrão é "Bruno Michel".

    *   **Regra 3: Substituição pelo Usuário (Prioridade Mínima)**
        *   Se a descrição do usuário nomear explicitamente um operador (ex: "O operador será o João"), isso anula todas as outras regras.

**Contexto do Usuário:**
"{{description}}"

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
