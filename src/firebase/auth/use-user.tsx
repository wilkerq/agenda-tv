'use client';

import { useContext } from 'react';
import type { User } from 'firebase/auth';
import { FirebaseContext } from '@/firebase/provider';

// Tipo de retorno para useUser() - específico para o estado de autenticação do usuário
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/**
 * Hook específico para acessar o estado do usuário autenticado.
 * Fornece o objeto User, o status de carregamento e quaisquer erros de autenticação.
 * @returns {UserHookResult} Objeto com user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de um FirebaseProvider.');
  }
  const { user, isUserLoading, userError } = context;
  return { user, isUserLoading, userError };
};
