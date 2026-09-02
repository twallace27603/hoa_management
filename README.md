# HOA Management Platform

Multi-tenant HOA management: document management, ARC (architecture review)
requests, covenant violation tracking, member/board email, and simple CMS.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design and the tradeoffs
behind it.

## Repo structure

```
apps/
  api/    NestJS backend (Prisma + Postgres, Entra External ID auth)
  web/    Next.js frontend (MSAL, Tailwind)
infra/
  bootstrap/   one-time: creates the Terraform remote state storage account
  modules/     reusable Terraform modules
  envs/dev/    the dev environment's Terraform root
  sql/         hand-run SQL hardening (append-only grants, future RLS)
.github/workflows/   CI, Terraform plan-on-PR, deploy-on-merge
```

## Local development

### Backend (`apps/api`)

```
cd apps/api
cp .env.example .env        # fill in a real DATABASE_URL and Entra values
npm install
npx prisma migrate dev      # creates tables against your local/dev Postgres
npm run db:seed             # seeds the initial Role rows
npm run start:dev
```

Runs on `http://localhost:3001`, API routes under `/api`.

### Frontend (`apps/web`)

```
cd apps/web
cp .env.local.example .env.local   # fill in Entra + API values
npm install
npm run dev
```

Runs on `http://localhost:3000`.

### Requires an Entra External ID tenant

Both apps need a Microsoft Entra External ID (CIAM) tenant with two app
registrations (one for the API exposing a scope like
`api://<api-client-id>/access_as_user`, one for the frontend SPA requesting
that scope) before sign-in works end-to-end. Step-by-step setup, plus
exactly which value maps to which `ENTRA_*` variable:
[docs/entra-external-id-setup.md](./docs/entra-external-id-setup.md).

## Infrastructure setup (one-time, per Azure subscription)

1. **Bootstrap Terraform state storage:**
   ```
   cd infra/bootstrap
   terraform init
   terraform apply -var="subscription_id=<your-subscription-id>"
   ```
   Note the `storage_account_name` and `resource_group_name` outputs.

2. **Create an OIDC federated app registration** for GitHub Actions (no
   client secret): an Azure AD app with a federated credential trusting
   `repo:<org>/<repo>:ref:refs/heads/main` (for `deploy.yml`) and
   `repo:<org>/<repo>:pull_request` (for `terraform-plan.yml`), assigned
   `Contributor` + `User Access Administrator` on the subscription or target
   resource group (the latter is needed because Terraform creates role
   assignments). Step-by-step Azure CLI commands: [docs/oidc-setup.md](./docs/oidc-setup.md).

3. **Set GitHub repo secrets:**
   - `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (from step 2)
   - `TFSTATE_RESOURCE_GROUP`, `TFSTATE_STORAGE_ACCOUNT` (from step 1)
   - `POSTGRES_ADMIN_PASSWORD` (generate a strong secret)
   - `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_JWKS_URI`, `ENTRA_ISSUER` (API app registration)
   - `FRONTEND_ENTRA_CLIENT_ID`, `ENTRA_AUTHORITY`, `ENTRA_KNOWN_AUTHORITY`, `ENTRA_API_SCOPE` (SPA app registration)
   - `FRONTEND_ORIGIN` (set after the first deploy reveals the Static Web App hostname; redeploy once known)
   - `API_BASE_URL` (same — the API's Container App FQDN, known after first apply)
   - `ACR_LOGIN_SERVER` (set after the first `terraform apply` creates the registry)

   Scripted: `cd infra/scripts && cp .env.example .env` (fill in real
   values), then `./set-github-secrets.sh`. Values you don't have yet
   (`FRONTEND_ORIGIN`, `API_BASE_URL`, `ACR_LOGIN_SERVER`) are skipped, not
   an error — fill them in and re-run after step 4.

4. **First deploy is manual** (chicken-and-egg: the registry/app don't exist
   yet for the workflow to target):
   ```
   cd infra/envs/dev
   cp terraform.tfvars.example terraform.tfvars   # fill in real values; gitignored
   az login
   terraform init -backend-config="resource_group_name=rg-hoa-mgmt-tfstate" -backend-config="storage_account_name=sthoamgmttfstate"
   terraform apply
   ```
   After this, `deploy.yml` can take over for subsequent pushes to `main`.

5. **Apply the SQL hardening script** once the API's first migration has run:
   ```
   psql "$DATABASE_URL" -f infra/sql/harden.sql
   ```

## Branching

Trunk-based: short-lived feature branches → PR → `main`. Enable branch
protection on `main` in GitHub repo settings (required review + required
status checks) — this isn't something Terraform/GitHub Actions config can
set on its own.
