# Create the GitHub Actions OIDC app registration

This is step 2 of the "Infrastructure setup" section in the root
[README.md](../README.md). It creates an Azure AD app registration that
`azure/login` in `terraform-plan.yml` and `deploy.yml` uses to authenticate
to Azure **without a stored client secret** — GitHub presents a short-lived
OIDC token, Azure AD trusts it because of the federated credentials
configured here.

Commands below are PowerShell.

> **Don't confuse this with Entra External ID.** This app registration lives
> in your **own Azure AD tenant** (the one your Azure subscription belongs
> to) and is only used for *deploying infrastructure*. It is a completely
> separate thing from the Entra **External ID (CIAM)** tenant used for
> *member/board sign-in* to the app itself (see `README.md` → "Requires an
> Entra External ID tenant"). Two different tenants, two different
> purposes — don't reuse one for the other.

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) installed and run `az login`.
- Your account needs permission to create app registrations in Azure AD
  (the default for most tenants; if your tenant restricts this, you need
  the **Application Administrator** or **Cloud Application Administrator**
  directory role).
- Your account needs **Owner** or **User Access Administrator** on the
  target Azure subscription, to grant the new app roles in step 4.
- Know your GitHub `<org>/<repo>` (e.g. `myorg/hoa-management`).

## 1. Create the app registration

```powershell
$app = az ad app create --display-name "hoa-management-github-actions" -o json | Out-String | ConvertFrom-Json

#existing $app=az ad app list --filter "displayname eq 'hoa-management-github-actions'" -o json | out-string | ConvertFrom-Json
$APP_ID = $app.appId          # future AZURE_CLIENT_ID
$APP_OBJECT_ID = $app.id      # the app registration's object id, needed in step 3
$APP_ID
$APP_OBJECT_ID
```

## 2. Create a service principal for it

```powershell
$sp = az ad sp create --id $APP_ID -o json | Out-String | ConvertFrom-Json
#Existing  $sp = az ad sp show --id $app.appid | out-string | ConvertFrom-Json
$SP_OBJECT_ID = $sp.id
$SP_OBJECT_ID
```

`$SP_OBJECT_ID` is the service principal's own object ID — **not** the same
as `$APP_OBJECT_ID` from step 1 (that's the app *registration's* object ID).
Step 4 needs this one specifically.

## 3. Add the federated credentials

Two are needed — one for deploys from `main`, one for `terraform plan` on
pull requests. Replace `<org>/<repo>` with your actual GitHub repo. Writing
the JSON to a file first (rather than inlining it as a quoted string) avoids
PowerShell's quote-escaping rules entirely.

```powershell
$ORG_REPO = "twallace27603/hoa_management"

@"
{
  "name": "github-deploy-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:$ORG_REPO:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}
"@ | Set-Content -Path fed-main.json -Encoding utf8

@"
{
  "name": "github-terraform-plan-pr",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:$ORG_REPO:pull_request",
  "audiences": ["api://AzureADTokenExchange"]
}
"@ | Set-Content -Path fed-pr.json -Encoding utf8

az ad app federated-credential create --id $APP_OBJECT_ID --parameters "@fed-main.json"
az ad app federated-credential create --id $APP_OBJECT_ID --parameters "@fed-pr.json"

Remove-Item fed-main.json, fed-pr.json
```

The `subject` is what GitHub's OIDC token asserts and what Azure checks
before issuing an access token — it's the whole trust boundary. If you add
other workflows later that also need Azure access (e.g. a deploy from a
`release` tag), add another federated credential with the matching subject
rather than loosening these two.

## 4. Grant the app roles on the subscription

`Contributor` lets Terraform create resources; `User Access Administrator`
is needed too because Terraform creates role assignments (e.g. granting the
Container App's managed identity access to Key Vault and Storage).

Use `--assignee-object-id` + `--assignee-principal-type ServicePrincipal`
here, **not** `--assignee $APP_ID`. The plain `--assignee` form makes the
CLI resolve your app's client ID to a principal via an old Azure AD Graph
lookup that's fragile on many tenants today — it commonly fails with an
opaque `Operation returned an invalid status 'Bad Request'` /
JSON-deserialization error. Passing the service principal's object ID
directly (from step 2) skips that lookup entirely.

```powershell
$SUBSCRIPTION_ID = az account show --query id -o tsv

az role assignment create `
  --assignee-object-id $SP_OBJECT_ID `
  --assignee-principal-type ServicePrincipal `
  --role "Contributor" `
  --scope "/subscriptions/$SUBSCRIPTION_ID"

az role assignment create `
  --assignee-object-id $SP_OBJECT_ID `
  --assignee-principal-type ServicePrincipal `
  --role "User Access Administrator" `
  --scope "/subscriptions/$SUBSCRIPTION_ID"
```

**Least-privilege alternative:** if you'd rather not grant subscription-wide
access, scope both role assignments to just the two resource groups this
project touches instead of `/subscriptions/$SUBSCRIPTION_ID`:
- `rg-hoa-mgmt-tfstate` (from `infra/bootstrap`)
- `rg-hoa-<environment>` (from `infra/envs/<environment>`, e.g. `rg-hoa-dev` — this resource group doesn't exist until the first manual `terraform apply` in README step 4, so scope to the subscription for the very first run and narrow it afterward if you want).

## 5. Collect the values you need for GitHub secrets

```powershell
"AZURE_CLIENT_ID=$APP_ID"
"AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
"AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
```

Feed these into `infra/scripts/set-github-secrets.sh` (see
`infra/scripts/.env.example`) to populate the corresponding GitHub repo
secrets — that script covers all of README step 3, not just these three.

## 6. Verify

```powershell
az ad app federated-credential list --id $APP_OBJECT_ID -o table
az role assignment list --assignee $SP_OBJECT_ID -o table
```

You should see both federated credentials and both role assignments listed.
(`az role assignment list --assignee` still works for *listing* by either
the app ID or the SP object ID — the fragile Graph-lookup path is a
`create`-time issue.)
