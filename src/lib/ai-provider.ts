'use server';

import { ai } from '@/ai/genkit';

/**
 * Esta é uma função SERVER-SIDE que determina qual modelo de IA usar.
 * Atualizada para usar os modelos Ollama configurados em @/ai/genkit para o ambiente Docker.
 * @param modelType O tipo de modelo necessário ('text' ou 'vision').
 * @returns Uma referência ao modelo Genkit.
 */
export async function getModel(modelType: 'text' | 'vision' = 'text'): Promise<any> {
    
  // Usa 'ollama/llama3' para texto e 'ollama/llava' para visão.
  // Esses nomes correspondem aos definidos na configuração do seu genkit.ts e aos plugins instalados.
  const modelName = modelType === 'vision' ? 'ollama/llava' : 'ollama/llama3';
  
  // Referencia o modelo através do objeto `ai` configurado centralmente.
  // Isso evita a necessidade de importar pacotes de provedores específicos aqui.
  return ai.model(modelName);
}