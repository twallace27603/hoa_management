import type { IPublicClientApplication } from '@azure/msal-browser';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { apiTokenRequest } from './msal-config';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

async function getAccessToken(msal: IPublicClientApplication): Promise<string> {
  const account = msal.getActiveAccount();
  if (!account) throw new Error('No active account: user must sign in first');

  try {
    const result = await msal.acquireTokenSilent({ ...apiTokenRequest, account });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const result = await msal.acquireTokenPopup(apiTokenRequest);
      return result.accessToken;
    }
    throw error;
  }
}

// Every call goes straight to the NestJS API with a bearer token; there is
// no Next.js server-side proxy/session, so the API is the sole
// authorization boundary (see apps/api/src/auth).
export async function apiFetch<T>(msal: IPublicClientApplication, path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken(msal);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

// For public, unauthenticated endpoints (e.g. published CMS pages).
export async function publicApiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}
