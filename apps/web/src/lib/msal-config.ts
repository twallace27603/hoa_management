import type { Configuration } from '@azure/msal-browser';

// Microsoft Entra External ID (CIAM) tenant. Authority is the tenant's
// ciamlogin.com endpoint, e.g. https://<tenant-subdomain>.ciamlogin.com/<tenant-id>.
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID ?? '',
    authority: process.env.NEXT_PUBLIC_ENTRA_AUTHORITY ?? '',
    knownAuthorities: [process.env.NEXT_PUBLIC_ENTRA_KNOWN_AUTHORITY ?? ''],
    redirectUri: process.env.NEXT_PUBLIC_ENTRA_REDIRECT_URI ?? '/',
    postLogoutRedirectUri: '/',
  },
  cache: {
    // localStorage (not sessionStorage) so a refresh/new tab doesn't force
    // re-login; MSAL still scopes tokens per-account and enforces expiry.
    cacheLocation: 'localStorage',
  },
};

// Scope exposed by the backend API's app registration. Requesting it here
// gets us an access token audienced for the API (aud === ENTRA_CLIENT_ID of
// the API), which is what apps/api's JwtStrategy validates.
export const apiTokenRequest = {
  scopes: [process.env.NEXT_PUBLIC_ENTRA_API_SCOPE ?? ''],
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', ...apiTokenRequest.scopes],
};
