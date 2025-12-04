'use server';

import { createOllama } from 'ollama-ai-provider';

// Configura o provider do Ollama lendo a variável de ambiente.
// O fallback para 'host.docker.internal' é útil para cenários de desenvolvimento com Docker.
const ollamaServerAddress = process.env.OLLAMA_SERVER_ADDRESS || 'http://host.docker.internal:11434';

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
export const aiVisionModel = ollama('moondream');
