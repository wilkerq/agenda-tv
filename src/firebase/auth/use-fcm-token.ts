
'use client';

import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { useMessaging, useUser, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

// FCM VAPID key from Firebase project settings
const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || '';
if (!VAPID_KEY) {
  console.warn(
    'NEXT_PUBLIC_FCM_VAPID_KEY is not set. Push notifications will not work.'
  );
}

export const useFcmToken = () => {
  const { user } = useUser();
  const messaging = useMessaging();
  const db = useFirestore();
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const retrieveToken = async () => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && messaging) {
        try {
          // 1. Check current permission status
          const currentPermission = Notification.permission;
          setPermission(currentPermission);

          if (currentPermission === 'granted') {
            const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (fcmToken) {
              setToken(fcmToken);
              // If user is logged in, save token to their document
              if (user && db) {
                const userDocRef = doc(db, 'users', user.uid);
                await setDoc(userDocRef, { fcmToken: fcmToken }, { merge: true });
              }
            } else {
              console.log('No registration token available. Request permission to generate one.');
              // Optionally request permission again here if you want to be more aggressive
            }
          } else if (currentPermission === 'default') {
            // 2. If permission is not yet granted or denied, request it.
            const permissionStatus = await Notification.requestPermission();
            setPermission(permissionStatus);

            if (permissionStatus === 'granted') {
              const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
               if (fcmToken) {
                 setToken(fcmToken);
                 if (user && db) {
                    const userDocRef = doc(db, 'users', user.uid);
                    await setDoc(userDocRef, { fcmToken }, { merge: true });
                 }
               }
            }
          }
        } catch (err) {
          console.error('An error occurred while retrieving token. ', err);
          setError(err as Error);
        }
      }
    };

    retrieveToken();
  }, [messaging, user, db]);

  // Handle foreground messages
  useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received.', payload);
        // Here you could show an in-app notification/toast
      });
      return () => unsubscribe();
    }
  }, [messaging]);

  return { token, permission, error };
};
