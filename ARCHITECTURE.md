# Architecture

## Goals

- **Cost and reliability first.** Low volume at launch; everything should scale to
  near-zero cost when idle and scale up without a re-architecture.
- **Multi-tenant SaaS from day one.** The platform hosts multiple HOAs, not just one.
- **Flexible functional surface.** Document management, ARC requests, covenant
  violations, email, and CMS today; more functional areas and roles later.
- **Managed everything.** No self-hosted IdP, no self-managed database engine
  patching, no Kubernetes cluster to operate.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Identity | Microsoft Entra External ID (CIAM) | Managed customer-identity product: email/password + social federation (Google, Facebook, etc.), free up to 50k MAU |
| Backend | NestJS (Node/TypeScript) on Azure Container Apps (Consumption) | Modular structure suits a growing set of functional areas; Consumption plan scales to zero |
| Frontend | Next.js on Azure Static Web Apps | Managed builds/CDN/SSL, PR preview environments, cheap |
| Database | Azure Postgres Flexible Server (Burstable B1ms) | Cheapest general-purpose managed Postgres tier; native RLS support for future defense-in-depth |
| ORM | Prisma (with `@prisma/adapter-pg`) | Type-safe schema/migrations; the driver-adapter client avoids bundling a Rust query-engine binary |
| Files | Azure Blob Storage, private containers + short-lived SAS URLs | Files never transit the API's compute, keeping it stateless and cheap |
| Email | Azure Communication Services Email | Native to Azure, pay-per-email, swappable behind `EmailSender` interface |
| Secrets | Azure Key Vault + user-assigned managed identity | No secrets in app config or Terraform state beyond the initial write |
| IaC | Terraform, remote state in Azure Storage | See `infra/` |
| CI/CD | GitHub Actions, OIDC to Azure (no stored cloud credentials) | See `.github/workflows/` |

## Multi-tenancy model

Every tenant-scoped table carries `hoaId` directly (see `apps/api/prisma/schema.prisma`).
Isolation today is enforced by the application layer: every service method
filters by `hoaId` and every mutating route is gated by `RolesGuard`
(`apps/api/src/auth/roles.guard.ts`), which checks the caller's `Membership`
rows for the HOA identified by the `:hoaId` route param.

Postgres row-level security as a second layer is a deliberately deferred
follow-up (see `infra/sql/harden.sql`) — it requires the app to set a
per-request session variable inside a transaction, which hasn't been wired
into `PrismaService` yet. Applying the RLS policies without that wiring
would silently return zero rows from every query, so don't uncomment them
until that wrapper exists.

A single Postgres role today has UPDATE/DELETE **revoked** on
`ViolationHistoryEntry` and `ViolationPhoto` (also `infra/sql/harden.sql`) —
this one *is* fully wired and safe to run, since the app never issues
UPDATE/DELETE against those tables by design.

## Authentication and authorization

Authentication (proving who you are) and authorization (what you can do)
are deliberately separate:

1. An HOA admin invites a person by creating a `Membership` row with
   `status: PENDING`, an `invitedEmail`, and a `roleId` — no `User` row
   exists yet (`MembershipsService.invite`).
2. The invitee signs in via Entra External ID (email/password or a
   federated social account) using MSAL in the frontend
   (`apps/web/src/lib/msal-config.ts`).
3. The frontend calls `POST /auth/session` once after sign-in
   (`SessionBootstrap` component), which links the Entra identity
   (`oid` claim) to a `User` row and activates any `PENDING` memberships
   matching that email (`MembershipsService.activatePendingMembershipsForEmail`).
4. Every subsequent API request carries a bearer access token; `JwtStrategy`
   validates it against Entra's JWKS endpoint and resolves the caller's
   `AuthenticatedUser` (their activated memberships and roles) from the
   database — **not** from any role claim in the token itself.

No matching invite means no access, regardless of how someone authenticates.
Roles are rows in a `Role` table, not a hardcoded enum, so new roles can be
introduced as data (see `apps/api/prisma/seed.ts` for the initial set:
`GLOBAL_ADMIN`, `HOA_PRESIDENT`, `HOA_BOARD`, `ARC_CHAIR`, `MEMBER`, `PUBLIC`).

The frontend's auth gating (`AuthenticatedTemplate`/`UnauthenticatedTemplate`,
role-based UI) is UX only. The actual authorization boundary is the API's
`RolesGuard` — every route re-checks the caller's roles server-side.

## Known gaps / deliberately deferred

These are flagged inline in code as `TODO`s; listed here for visibility:

- **Postgres RLS** — see Multi-tenancy model above.
- **VNet integration for Container Apps / Postgres** — v1 uses Postgres
  public access restricted to "Allow Azure services" + enforced TLS,
  because the Container Apps Consumption plan has no stable outbound IP to
  firewall-allowlist without VNet integration (which adds NAT gateway cost).
  Revisit once volume/budget justify it.
- **File upload wiring** — `StorageService` can mint SAS URLs, but the
  documents/ARC-request/violation-photo upload flows are stubbed
  (`TODO: accept a file upload...`) pending frontend upload UI.
- **Tenant resolution on the public site** — the frontend doesn't yet
  resolve "which HOA" from a subdomain or path; `apps/web/src/app/page.tsx`
  is a generic landing page today.
- **CMS content sanitization** — `CmsPage.bodyHtml` is board-authored but
  still needs allowlist sanitization (e.g. DOMPurify) before rendering.

## Branching and CI/CD

Trunk-based: short-lived feature branches → PR → `main`. No long-lived
`develop`/`release` branches. Protect `main` in GitHub repo settings
(required PR review + required status checks) — this can't be set via code.

- `.github/workflows/ci.yml` — runs on every PR and push to `main`: lint,
  test, build (API + web), CodeQL SAST, dependency review, secret scanning
  (gitleaks), Terraform fmt/validate + tfsec, and a Trivy container scan of
  the API image.
- `.github/workflows/terraform-plan.yml` — comments a `terraform plan` on
  PRs touching `infra/`.
- `.github/workflows/deploy.yml` — on merge to `main`: builds/pushes the API
  image, applies Terraform, deploys the frontend to Static Web Apps.

Both infra workflows authenticate to Azure via OIDC (`azure/login`), not a
stored client secret. See `README.md` for the one-time setup this requires.
