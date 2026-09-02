# Configure the Entra External ID (CIAM) apps

This covers the "Requires an Entra External ID tenant" section of the root
[README.md](../README.md) — the two app registrations that back member/board
sign-in, and exactly which value from each maps to which environment
variable / GitHub secret.

> **Don't confuse this with the OIDC deployment app registration.** This is
> a *separate* tenant and *separate* app registrations from
> [docs/oidc-setup.md](./oidc-setup.md), which is about GitHub Actions
> authenticating to Azure to deploy infrastructure. This doc is about
> letting HOA members and board members sign in to the app itself. See
> `ARCHITECTURE.md` → "Authentication and authorization" for how the two
> apps below fit into the invite/activation flow.

Portal steps below use the [Microsoft Entra admin center](https://entra.microsoft.com).
A few steps (exposing an API scope, configuring the SPA platform type) don't
have reliable Azure CLI equivalents today, so this doc is portal-first
rather than mixing in CLI where it'd be more fragile than helpful.

## Prerequisites

- An Entra External ID (CIAM) tenant. If you don't have one yet, follow
  Microsoft's [tenant setup quickstart](https://learn.microsoft.com/entra/external-id/customers/quickstart-tenant-setup) —
  tenant creation itself is a one-time, portal-only, infrequent action not
  worth scripting here.
- At least **Application Administrator** in that tenant.
- For social federation (optional): a Google Cloud project / Facebook
  Developer app already created, if you want Google/Facebook sign-in on top
  of email/password.

## 1. Register the API app

This represents `apps/api` — the NestJS backend. It doesn't sign anyone in
itself; it only needs to *validate* tokens and *expose a scope* the
frontend can request.

1. **App registrations → New registration.** Name it something like
   `hoa-management-api`. Leave redirect URI blank (APIs don't need one).
2. **Expose an API** (left nav): next to *Application ID URI*, select
   **Add**, accept the proposed `api://<api-client-id>` value, **Save**.
3. Still on **Expose an API**, **Add a scope**:
   - Scope name: `access_as_user`
   - Who can consent: *Admins and users*
   - Admin/user consent display name & description: e.g. "Access the HOA
     management API as the signed-in user"
   - State: *Enabled*
4. Note the **Application (client) ID** and the tenant's **Directory
   (tenant) ID** (Overview page) — you'll need both below.

## 2. Register the frontend (SPA) app

This represents `apps/web` — the Next.js frontend using MSAL.

1. **App registrations → New registration.** Name it e.g.
   `hoa-management-web`. Under **Redirect URI**, choose platform
   **Single-page application (SPA)** and enter `http://localhost:3000` for
   local dev (add the production Static Web App hostname later, once known
   — see README "Infrastructure setup" step 3).
2. **API permissions → Add a permission → My APIs →** select the API app
   from step 1 → **Delegated permissions** → check `access_as_user` →
   **Add permissions**.
3. **Grant admin consent** for the tenant on that same page (so users
   aren't prompted to consent individually).
4. Note this app's **Application (client) ID**.

## 3. Create a user flow and attach both apps

1. **External Identities → User flows → New user flow.** Choose
   *Sign up and sign in*.
2. Under **Identity providers**, at minimum enable **Email with password**
   (this is the "email-based account provisioning" from the original
   requirements). Add **Google** / **Facebook** here too if you want social
   sign-in — each requires registering an OAuth app on that provider's side
   first and pasting its client ID/secret into Entra
   ([Google federation guide](https://learn.microsoft.com/entra/external-id/customers/how-to-google-federation-customers),
   [Facebook federation guide](https://learn.microsoft.com/entra/external-id/customers/how-to-facebook-federation-customers)).
3. Under **User attributes**, collect at least **Email Address** — the API
   requires an email claim on the token (`JwtStrategy.validate` throws if
   it's missing).
4. Save the user flow, then open it → **Applications → Add application** →
   attach **both** app registrations from steps 1 and 2. An application can
   only be attached to one user flow, but one user flow can serve many
   applications — this is intentional, both apps in this project share it.

> **This user flow does not gate access on its own.** Anyone can complete
> it and get a valid Entra identity — that's expected. Real access is
> granted by an HOA admin creating a `Membership` row (see
> `MembershipsService.invite`); a signed-in user with no matching
> membership still can't do anything. Don't look for an "invite only"
> toggle here — the gate is enforced by this app, not by the CIAM user flow.

## 4. Map values to environment variables / secrets

| Value | Where to find it | Used in |
|---|---|---|
| `ENTRA_TENANT_ID` | API app → Overview → Directory (tenant) ID | `apps/api/.env`, GitHub secret |
| `ENTRA_CLIENT_ID` | API app → Overview → Application (client) ID | `apps/api/.env`, GitHub secret |
| `ENTRA_JWKS_URI` | `https://<tenant-subdomain>.ciamlogin.com/<tenant-id>/discovery/v2.0/keys` | `apps/api/.env`, GitHub secret |
| `ENTRA_ISSUER` | `https://<tenant-subdomain>.ciamlogin.com/<tenant-id>/v2.0` | `apps/api/.env`, GitHub secret |
| `FRONTEND_ENTRA_CLIENT_ID` | SPA app → Overview → Application (client) ID | `apps/web/.env.local`, GitHub secret |
| `ENTRA_AUTHORITY` | `https://<tenant-subdomain>.ciamlogin.com/<tenant-id>` | `apps/web/.env.local`, GitHub secret |
| `ENTRA_KNOWN_AUTHORITY` | `<tenant-subdomain>.ciamlogin.com` | `apps/web/.env.local`, GitHub secret |
| `ENTRA_API_SCOPE` | `api://<api-client-id>/access_as_user` (client ID from step 1) | `apps/web/.env.local`, GitHub secret |

`<tenant-subdomain>` is the name you picked when creating the tenant (e.g.
`hoamanagement` → `hoamanagement.ciamlogin.com`); `<tenant-id>` is the same
Directory (tenant) ID as `ENTRA_TENANT_ID`. You can confirm both — and
sanity-check the exact issuer/JWKS URLs your tenant actually serves —
by fetching:
```
https://<tenant-subdomain>.ciamlogin.com/<tenant-id>/v2.0/.well-known/openid-configuration
```
and reading its `issuer` and `jwks_uri` fields directly, rather than
hand-assembling the URLs above. This matters because `JwtStrategy` validates
the token's `iss` claim against `ENTRA_ISSUER` for an **exact string match**
— if the two don't agree character-for-character (a stray trailing slash, a
tenant *name* where the token actually asserts the tenant *GUID*, or vice
versa), every request will be rejected with a signature/issuer validation
error that has nothing to do with the actual signing key. If you hit that,
compare against the discovery document above before assuming the JWKS/keys
are wrong.

Once you have all eight values, feed them into
`infra/scripts/set-github-secrets.sh` (see `infra/scripts/.env.example`)
alongside the values from `docs/oidc-setup.md`.

Sources: [Expose scopes in a protected web API](https://learn.microsoft.com/entra/identity-platform/scenario-protected-web-api-expose-scopes) · [Configure single-page app](https://learn.microsoft.com/entra/identity-platform/scenario-spa-app-configuration) · [Create a sign-up and sign-in user flow](https://learn.microsoft.com/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers) · [Identity providers for external tenants](https://learn.microsoft.com/entra/external-id/customers/concept-authentication-methods-customers)
