
'use server';
// This file is a workaround for a circular dependency issue.
// Do not import anything here that depends on `ai` from `genkit.ts`
// if it also needs to be imported by `genkit.ts` itself.

// OBS: Os fluxos foram removidos deste arquivo para evitar o carregamento antecipado
// que estava causando um erro de inicialização no servidor.
// O Next.js agora carregará cada fluxo sob demanda quando sua função wrapper for chamada.
