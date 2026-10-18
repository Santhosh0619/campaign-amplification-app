import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useAuth } from '@/store/auth';

/** Runs an action only when signed in; otherwise opens the sign-in sheet and returns to the caller afterwards. */
export function useAuthGate() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  return useCallback(
    (action: () => void) => {
      if (user) action();
      else router.push('/auth');
    },
    [user, router],
  );
}
