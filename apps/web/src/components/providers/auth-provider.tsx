'use client';

import { useEffect, useState } from 'react';
import { PublicClientApplication, type IPublicClientApplication, EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from '@/lib/msal-config';

// MSAL (and therefore auth state) only exists in the browser. This is a
// Client Component wrapped around {children} in the root layout, per
// Next.js's "Context Providers" pattern for client-side auth libraries —
// Server Components rendered inside it do not see this context, only
// Client Components do. Real authorization is enforced by the API
// (see apps/api RolesGuard); nothing here is a security boundary.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [msalInstance, setMsalInstance] = useState<IPublicClientApplication | null>(null);

  useEffect(() => {
    const instance = new PublicClientApplication(msalConfig);
    instance.initialize().then(() => {
      const account = instance.getAllAccounts()[0];
      if (account) instance.setActiveAccount(account);
      // (else) no cached account yet — setActiveAccount(null) is the default state, nothing to do.

      instance.addEventCallback((event) => {
        if (
          event.eventType === EventType.LOGIN_SUCCESS &&
          event.payload &&
          'account' in event.payload &&
          event.payload.account
        ) {
          instance.setActiveAccount(event.payload.account);
        }
      });

      setMsalInstance(instance);
    });
  }, []);

  if (!msalInstance) return null;

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
