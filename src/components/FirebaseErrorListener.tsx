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

      // Optionally, show a generic toast to the user.
      toast({
        title: 'Erro de Permissão',
        description: 'Sua operação foi bloqueada pelas regras de segurança. Verifique o console para mais detalhes.',
        variant: 'destructive',
        duration: 8000,
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null; // This component does not render anything.
}
