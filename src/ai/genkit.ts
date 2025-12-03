
  /**
   * @fileOverview Initializes and configures the Genkit AI instance.
   * This file sets up the necessary plugins for the AI functionalities.
   */
  import { genkit } from 'genkit';
  import { ollama } from 'genkitx-ollama';
  
  // A configuração agora lê do ambiente, com fallback para localhost caso não definido.
  const ollamaServerAddress = process.env.OLLAMA_SERVER_ADDRESS || 'http://127.0.0.1:11434';
  
  export const ai = genkit({
    plugins: [
      ollama({
        // Define os modelos que o Genkit pode usar
        models: [
          { name: 'llama3:latest', type: 'generate' },
          { name: 'gemma3:latest', type: 'generate' },
          { name: 'llama3.2:1b', type: 'generate' },
        ],
        
        // Usa a variável de ambiente definida no .env ou docker-compose
        serverAddress: ollamaServerAddress,
      }),
    ],
  });
