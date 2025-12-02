/**
 * @fileOverview Initializes and configures the Genkit AI instance.
 * This file sets up the necessary plugins for the AI functionalities.
 */
import { genkit } from 'genkit';
import { ollama } from 'genkitx-ollama';

// Este ficheiro configura o Genkit para usar o serviço Ollama.
// Ele aponta para o endereço do container Docker configurado via variável de ambiente.

export const ai = genkit({
  plugins: [
    ollama({
      // Define os modelos que o Genkit pode usar
      models: [
        { name: 'ollama/llama3' }, 
        { name: 'ollama/llava', type: 'generate' },
      ],
      
      // Usa a variável de ambiente definida no docker-compose ou fallback para localhost
      serverAddress: 'http://170.254.10.34:11434',
    }),
  ],
});
