
'use client';

import { useEffect } from 'react';
import { useFcmToken } from '@/firebase/auth/use-fcm-token';
import { useToast } from '@/hooks/use-toast';

/**
 * An invisible component responsible for managing Push Notification permissions and tokens.
 * It should be placed within a layout for logged-in users.
 */
export function PushNotificationManager() {
  const { permission, error } = useFcmToken();
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro nas Notificações Push',
        description: 'Não foi possível inicializar as notificações. Verifique as permissões do navegador e as configurações do Firebase.',
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (permission === 'granted') {
      console.log('Push notification permission granted.');
    } else if (permission === 'denied') {
      console.warn('Push notification permission denied.');
      // Optionally, show a non-intrusive message to the user explaining the benefits of enabling notifications.
    }
  }, [permission]);

  // This component renders nothing to the UI.
  return null;
}
