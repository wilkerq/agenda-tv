
import { createOllama } from 'ollama-ai-provider';

// Configura o provider do Ollama lendo a variável de ambiente.
const ollamaServerAddress = process.env.OLLAMA_SERVER_ADDRESS || 'http://127.0.0.1:11434';

const ollama = createOllama({
    baseURL: ollamaServerAddress,
});

/**
 * Modelo de linguagem para tarefas de texto e JSON.
 * Rápido e eficiente.
 */
export const aiModel = ollama('llama3');

/**
 * Modelo de visão computacional para análise de imagens.
 * Ultra-leve e otimizado para extração de dados de imagens.
 */
export const