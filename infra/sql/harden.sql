-- Run once after the first `prisma migrate deploy` against a new database
-- (Prisma must create the tables first). Not managed by Terraform: it needs
-- a live connection to the database.
--
-- Usage: psql "$DATABASE_URL" -f infra/sql/harden.sql

-- ---------------------------------------------------------------------------
-- Append-only violation history: the app's own DB role can INSERT/SELECT
-- but never UPDATE/DELETE these tables, regardless of what application code
-- does or a future bug allows. Replace `app_user` with the actual Postgres
-- role the API connects as (the Prisma migration user should be a separate,
-- more privileged role, since this role can no longer ALTER these tables
-- either once locked down further).
-- ---------------------------------------------------------------------------
REVOKE UPDATE, DELETE ON "ViolationHistoryEntry" FROM app_user;
REVOKE UPDATE, DELETE ON "ViolationPhoto" FROM app_user;

-- ---------------------------------------------------------------------------
-- NOT YET APPLIED: Postgres row-level security as defense-in-depth beneath
-- the app's existing `where: { hoaId }` filtering (present on every
-- tenant-scoped query today — see apps/api/src/*/​*.service.ts). Adding RLS
-- here requires the app to set a per-request session variable first
-- (`SELECT set_config('app.current_hoa_id', $1, true)` inside the same
-- transaction, via a Prisma `$transaction` wrapper), otherwise every RLS
-- policy below would evaluate to false and every query would silently
-- return zero rows. That wrapper doesn't exist yet, so do NOT uncomment
-- this until PrismaService grows a `withHoaContext()` (or equivalent) and
-- every tenant-scoped service is retrofitted to use it.
--
-- ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation ON "Document"
--   USING ("hoaId" = current_setting('app.current_hoa_id', true)::uuid);
-- (repeat for DocumentFolder, ArcRequest, Violation, CmsPage, EmailMessage)
--
-- A GLOBAL_ADMIN cross-tenant query path should use a separate, explicitly
-- audited connection role with BYPASSRLS rather than a magic sentinel value.
