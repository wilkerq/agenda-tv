'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Um componente invisível que escuta eventos 'permission-error' emitidos globalmente.
 * Ele lança qualquer erro recebido para ser capturado pelo global-error.tsx do Next.js.
 */
export function FirebaseErrorListener() {
  // Usa o tipo de erro específico para o estado para segurança de tipo.
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    // O callback agora espera um erro fortemente tipado, correspondendo ao payload do evento.
    const handleError = (error: FirestorePermissionError) => {
      // Define o erro no estado para acionar uma nova renderização.
      setError(error);
    };

    // O emissor tipado garantirá que o callback para 'permission-error'
    // corresponda ao tipo de payload esperado (FirestorePermissionError).
    errorEmitter.on('permission-error', handleError as any);

    // Desinscreve-se na desmontagem para evitar vazamentos de memória.
    return () => {
      errorEmitter.off('permission-error', handleError as any);
    };
  }, []);

  // Na nova renderização, se um erro existir no estado, lança-o.
  if (error) {
    throw error;
  }

  // Este componente não renderiza nada.
  return null;
}
