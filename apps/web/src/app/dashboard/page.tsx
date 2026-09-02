'use client';

import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { LoginButton, LogoutButton } from '@/components/auth/auth-buttons';
import { SessionBootstrap } from '@/components/auth/session-bootstrap';

// UI-level gating only, for a reasonable logged-out experience. The API
// (apps/api RolesGuard) is the actual authorization boundary — every
// request here still needs a valid, role-checked bearer token to succeed.
export default function DashboardPage() {
  const { accounts } = useMsal();
  const account = accounts[0];

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 p-8">
      <UnauthenticatedTemplate>
        <p>You need to sign in to view your dashboard.</p>
        <LoginButton />
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
        <SessionBootstrap />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Welcome{account ? `, ${account.name}` : ''}</h1>
          <LogoutButton />
        </div>
        <p className="text-gray-600">
          This is a placeholder dashboard. Documents, ARC requests, violations, and membership
          management will surface here per HOA and role.
        </p>
      </AuthenticatedTemplate>
    </main>
  );
}
