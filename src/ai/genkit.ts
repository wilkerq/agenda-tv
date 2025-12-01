/**
 * @fileOverview Initializes and configures the Genkit AI instance.
 * This file sets up the necessary plugins for the AI functionalities.
 */
'use server';
import { genkit } from 'genkit';
import { ollama } from 'genkitx-ollama';

// Este ficheiro configura o Genkit para usar o serviço Ollama.
// Ele aponta para o endereço do container Docker que você configurou.

export const ai = genkit({
  plugins: [
    ollama({
      // Define os modelos que o Genkit pode usar
      models: [
        { name: 'llama3' }, // Modelo de texto
        { name: 'llava', type: 'multi-modal' }, // Modelo multimodal (texto e imagem)
      ],
      // Endereço do servidor Ollama. Se estiver a correr localmente, é este.
      // Se o seu backend estiver noutro container Docker na mesma rede,
      // pode usar 'http://ollama:11434'.
      serverAddress: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    }),
  ],
  // Opcional: para ver mais detalhes durante o desenvolvimento
  logLevel: 'debug',
  enableTracing: true,
});
