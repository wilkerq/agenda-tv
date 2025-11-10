
'use client';

import { useEffect } from 'react';
import { useFcmToken } from '@/firebase/auth/use-fcm-token';

/**
 * An invisible component responsible for managing Push Notification permissions and tokens.
 * It should be placed within a layout for logged-in users.
 */
export function PushNotificationManager() {
  const { permission } = useFcmToken();

  useEffect(() => {
    if (permission === 'granted') {
      console.log('Push notification permission granted.');
    } else if (permission === 'denied') {
      console.warn('Push notification permission denied.');
    }
  }, [permission]);

  // This component renders nothing to the UI.
  return null;
}
