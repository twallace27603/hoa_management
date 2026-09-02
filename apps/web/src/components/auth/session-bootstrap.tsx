'use client';

import { useEffect } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { apiFetch } from '@/lib/api-client';

// Fires once after sign-in so the API can link this Entra identity to any
// PENDING invitation (see apps/api MembershipsService.activatePendingMembershipsForEmail).
// Mount this near the root of authenticated routes.
export function SessionBootstrap() {
  const isAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch(instance, '/auth/session', { method: 'POST' }).catch((error: unknown) => {
      console.error('Failed to bootstrap session', error);
    });
  }, [isAuthenticated, instance]);

  return null;
}
