variable "subscription_id" {
  type = string
}

variable "location" {
  type    = string
  default = "eastus2"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "postgres_administrator_login" {
  type    = string
  default = "hoaadmin"
}

variable "postgres_administrator_password" {
  type      = string
  sensitive = true
}

# Set by CI after it builds and pushes the image; defaults to a placeholder
# so `terraform plan` works before the first image exists.
variable "api_container_image" {
  type    = string
  default = "mcr.microsoft.com/k8se/quickstart:latest"
}

variable "entra_tenant_id" {
  type        = string
  description = "Microsoft Entra External ID (CIAM) tenant ID."
}

variable "entra_client_id" {
  type        = string
  description = "App registration client ID for the API in the CIAM tenant."
}

variable "entra_jwks_uri" {
  type = string
}

variable "entra_issuer" {
  type = string
}

variable "cors_origin" {
  type        = string
  description = "Frontend origin allowed to call the API, e.g. https://<static-web-app>.azurestaticapps.net."
}

variable "key_vault_deployer_object_ids" {
  type        = list(string)
  description = <<-EOT
    AAD object IDs granted Key Vault Secrets Officer on this environment's
    vault - every identity that runs `terraform apply` here, human or CI.
    Object IDs identify a principal for RBAC purposes only; they aren't
    credentials, so committing them isn't a secret leak (unlike the OIDC
    app's client ID, which stays a GitHub secret).
  EOT
  default     = [
    "7f7e7a37-2f48-47b1-b39b-027aadb8f68a", # local operator (tswwci@hotmail.com)
    "b4b9b751-e1c4-4f4d-8c24-939ff97c4dc9", # hoa-management-github-actions SP
  ]
}
