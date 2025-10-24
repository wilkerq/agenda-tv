
"use client";

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error(error); // This will show the detailed error in the dev console overlay.

      // Show a more helpful toast to the user.
      toast({
        title: 'Falha de Permissão',
        description: 'Sua solicitação foi bloqueada pelas regras de segurança. Verifique o console do desenvolvedor para obter detalhes técnicos.',
        variant: 'destructive',
        duration: 10000,
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null; // This component does not render anything.
}

    