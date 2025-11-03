'use client';

import { useContext } from 'react';
import type { User } from 'firebase/auth';
import { FirebaseContext, useFirebase, UserHookResult } from '@/firebase/provider';


/**
 * Hook specific for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase(); // Leverages the main hook
  return { user, isUserLoading, userError };
};
