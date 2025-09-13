
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
    prompt: `Você é um assistente especialista em agendamento de eventos para a Assembleia Legislativa de Goiás (Alego). O ano atual é ${new Date().getFullYear()}.
Sua tarefa é extrair detalhes de um evento a partir de uma imagem e aplicar regras de negócio para preencher os campos do evento.

Sua saída final DEVE estar em conformidade com o esquema JSON especificado.

**PARTE 1: EXTRAÇÃO DE DADOS DA IMAGEM**

Analise a imagem para extrair os seguintes detalhes brutos:

1.  **Nome do Evento (name):** Extraia o nome completo e detalhado. Dê preferência à descrição que estiver sob títulos como "Em pauta". Por exemplo, extraia "Sessão Solene de Homenagem aos Contadores" em vez de apenas "Sessão Solene".
2.  **Local (location):** Extraia o local específico (ex: "Plenário Iris Rezende Machado"). Se apenas o nome de um edifício for fornecido, infira o salão principal.
3.  **Data (date):** Você DEVE extrair tanto a data quanto a hora. Combine-os em uma única string no formato ISO 8601 ('AAAA-MM-DDTHH:mm:ss.sssZ'). Se você NÃO conseguir encontrar uma hora específica, DEVE retornar \`null\` para o campo de data. NÃO invente uma hora.

**PARTE 2: APLICAÇÃO DAS REGRAS DE NEGÓCIO**

Após a extração, aplique as seguintes regras para preencher os campos restantes:

1.  **Tipo de Transmissão (transmission):**
    *   Esta é uma regra OBRIGATÓRIA.
    *   Se o nome do evento contiver "Sessão" ou "Comissão", a transmissão DEVE ser "tv".
    *   Para TODOS os outros tipos de evento (ex: "Audiência Pública", "Solenidade"), a transmissão DEVE ser "youtube".
    *   Uma instrução explícita do usuário (ex: "transmitir na tv") pode anular esta regra.

2.  **Atribuição de Operador (operator):**
    *   Você DEVE atribuir um operador com base na seguinte hierarquia. A primeira regra correspondente determina o operador.

    *   **Regra 1: Local Específico (Prioridade Máxima)**
        *   Se o local for "Sala Julio da Retifica \"CCJR\"", o operador DEVE ser "Mário Augusto".

    *   **Regra 2: Turnos Durante a Semana (Segunda a Sexta)**
        *   **Manhã (00:00 - 12:00):** O operador padrão é "Rodrigo Sousa".
        *   **Tarde (12:01 - 18:00):** O operador DEVE ser um destes: "Ovidio Dias", "Mário Augusto" ou "Bruno Michel". Escolha um.
        *   **Noite (após 18:00):** O operador padrão é "Bruno Michel".
            
    *   **Regra 3: Eventos de Fim de Semana (Sábado e Domingo)**
        *   Se o evento ocorrer em um fim de semana, o operador DEVE ser um do grupo principal: ["Bruno Michel", "Mário Augusto", "Ovidio Dias"]. Escolha um.

    *   **Regra 4: Substituição pelo Usuário (Anula Todas as Outras)**
        *   Se a descrição do usuário nomear explicitamente um operador (ex: "O operador será o João"), essa instrução TEM prioridade total.

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
