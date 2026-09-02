data "azurerm_client_config" "current" {}

# Globally-unique resource names (storage account, key vault, ACR, ACS) need
# a per-subscription suffix; derived once and reused everywhere so re-runs
# are stable.
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  prefix = "hoa-${var.environment}"
  tags = {
    project     = "hoa-management"
    environment = var.environment
    managed_by  = "terraform"
  }
}

module "resource_group" {
  source   = "../../modules/resource_group"
  name     = "rg-${local.prefix}"
  location = var.location
  tags     = local.tags
}

module "log_analytics" {
  source              = "../../modules/log_analytics"
  name                = "log-${local.prefix}"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  tags                = local.tags
}

module "container_registry" {
  source              = "../../modules/container_registry"
  name                = "acr${replace(local.prefix, "-", "")}${random_string.suffix.result}"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  tags                = local.tags
}

module "container_apps_environment" {
  source                     = "../../modules/container_apps_environment"
  name                       = "cae-${local.prefix}"
  resource_group_name        = module.resource_group.name
  location                   = module.resource_group.location
  log_analytics_workspace_id = module.log_analytics.id
  tags                       = local.tags
}

module "key_vault" {
  source              = "../../modules/key_vault"
  name                = "kv-${local.prefix}-${random_string.suffix.result}"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  tags                = local.tags
}

# So `terraform apply` itself can write the secrets below.
resource "azurerm_role_assignment" "deployer_key_vault_secrets_officer" {
  scope                = module.key_vault.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

module "storage" {
  source              = "../../modules/storage"
  name                = "st${replace(local.prefix, "-", "")}${random_string.suffix.result}"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  tags                = local.tags
}

module "postgres" {
  source                 = "../../modules/postgres"
  name                   = "psql-${local.prefix}"
  resource_group_name    = module.resource_group.name
  location               = module.resource_group.location
  administrator_login    = var.postgres_administrator_login
  administrator_password = var.postgres_administrator_password
  tags                   = local.tags
}

module "communication_services" {
  source              = "../../modules/communication_services"
  name                = "acs-${local.prefix}"
  resource_group_name = module.resource_group.name
  tags                = local.tags
}

module "static_web_app" {
  source              = "../../modules/static_web_app"
  name                = "swa-${local.prefix}"
  resource_group_name = module.resource_group.name
  location            = var.location
  tags                = local.tags
}

resource "azurerm_key_vault_secret" "database_url" {
  name         = "database-url"
  key_vault_id = module.key_vault.id
  value        = "postgresql://${var.postgres_administrator_login}:${var.postgres_administrator_password}@${module.postgres.fqdn}:5432/${module.postgres.database_name}?sslmode=require"

  depends_on = [azurerm_role_assignment.deployer_key_vault_secrets_officer]
}

resource "azurerm_key_vault_secret" "acs_connection_string" {
  name         = "acs-connection-string"
  key_vault_id = module.key_vault.id
  value        = module.communication_services.connection_string

  depends_on = [azurerm_role_assignment.deployer_key_vault_secrets_officer]
}

module "container_app_api" {
  source                          = "../../modules/container_app_api"
  name                            = "ca-${local.prefix}-api"
  resource_group_name             = module.resource_group.name
  location                        = module.resource_group.location
  container_app_environment_id    = module.container_apps_environment.id
  container_registry_id           = module.container_registry.id
  container_registry_login_server = module.container_registry.login_server
  container_image                 = var.api_container_image
  key_vault_id                    = module.key_vault.id
  storage_account_id              = module.storage.id

  key_vault_secrets = {
    DATABASE_URL          = azurerm_key_vault_secret.database_url.versionless_id
    ACS_CONNECTION_STRING = azurerm_key_vault_secret.acs_connection_string.versionless_id
  }

  environment_variables = {
    NODE_ENV                   = "production"
    ENTRA_TENANT_ID            = var.entra_tenant_id
    ENTRA_CLIENT_ID            = var.entra_client_id
    ENTRA_JWKS_URI             = var.entra_jwks_uri
    ENTRA_ISSUER               = var.entra_issuer
    AZURE_STORAGE_ACCOUNT_NAME = module.storage.name
    ACS_SENDER_ADDRESS         = module.communication_services.sender_address
    CORS_ORIGIN                = var.cors_origin
    PORT                       = "3001"
  }

  tags = local.tags
}

# The API's own managed identity also needs to read secrets and generate
# blob SAS tokens - handled inside the container_app_api module itself.
