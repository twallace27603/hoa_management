'use client';

import { useMsal } from '@azure/msal-react';
import { loginRequest } from '@/lib/msal-config';

export function LoginButton() {
  const { instance } = useMsal();
  return (
    <button
      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      onClick={() => instance.loginRedirect(loginRequest)}
    >
      Sign in
    </button>
  );
}

export function LogoutButton() {
  const { instance } = useMsal();
  return (
    <button
      className="rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
      onClick={() => instance.logoutRedirect()}
    >
      Sign out
    </button>
  );
}
