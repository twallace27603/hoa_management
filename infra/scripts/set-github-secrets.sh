#!/usr/bin/env bash
# Sets every GitHub Actions secret used by .github/workflows/*.yml, sourced
# from a local .env file. See .env.example for the full list and where each
# value comes from (docs/oidc-setup.md, infra/bootstrap outputs, etc).
#
# Usage:
#   cd infra/scripts
#   cp .env.example .env   # fill in real values
#   ./set-github-secrets.sh [--dry-run]
#
# Secrets whose value is blank in .env are skipped (with a warning), not
# treated as an error - FRONTEND_ORIGIN, API_BASE_URL, and ACR_LOGIN_SERVER
# are legitimately unknown until after the first deploy (see README.md).
# Re-run this script once you have them.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--dry-run]" >&2
      exit 1
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI ('gh') is not installed. See https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: not logged in to gh. Run 'gh auth login' first." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Copy .env.example to .env and fill it in first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${GH_REPO:-}" ]]; then
  GH_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
fi

if [[ -z "${GH_REPO:-}" ]]; then
  echo "Error: could not determine target repo. Set GH_REPO in .env (owner/repo)." >&2
  exit 1
fi

echo "Target repo: $GH_REPO"
$DRY_RUN && echo "(dry run - no secrets will actually be set)"
echo

# Name of every secret referenced by .github/workflows/*.yml, excluding the
# auto-provided GITHUB_TOKEN.
SECRET_NAMES=(
  AZURE_CLIENT_ID
  AZURE_TENANT_ID
  AZURE_SUBSCRIPTION_ID
  TFSTATE_RESOURCE_GROUP
  TFSTATE_STORAGE_ACCOUNT
  POSTGRES_ADMIN_PASSWORD
  ENTRA_TENANT_ID
  ENTRA_CLIENT_ID
  ENTRA_JWKS_URI
  ENTRA_ISSUER
  FRONTEND_ENTRA_CLIENT_ID
  ENTRA_AUTHORITY
  ENTRA_KNOWN_AUTHORITY
  ENTRA_API_SCOPE
  FRONTEND_ORIGIN
  API_BASE_URL
  ACR_LOGIN_SERVER
)

set_count=0
skip_count=0
skipped_names=()

for name in "${SECRET_NAMES[@]}"; do
  value="${!name:-}"

  if [[ -z "$value" ]]; then
    skip_count=$((skip_count + 1))
    skipped_names+=("$name")
    continue
  fi

  if $DRY_RUN; then
    echo "Would set: $name"
  else
    printf '%s' "$value" | gh secret set "$name" --repo "$GH_REPO"
    echo "Set: $name"
  fi
  set_count=$((set_count + 1))
done

echo
echo "Done. $set_count secret(s) set, $skip_count skipped (blank in .env)."
if [[ $skip_count -gt 0 ]]; then
  echo "Skipped: ${skipped_names[*]}"
  echo "Fill these in and re-run once known (see README.md 'Infrastructure setup')."
fi
