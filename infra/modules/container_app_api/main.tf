resource "azurerm_user_assigned_identity" "this" {
  name                = "${var.name}-identity"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = var.container_registry_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.this.principal_id
}

resource "azurerm_role_assignment" "key_vault_secrets_user" {
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.this.principal_id
}

resource "azurerm_role_assignment" "storage_blob_data_contributor" {
  scope                = var.storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.this.principal_id
}

# Container Apps' own "secretRef" mechanism reads Key Vault values at
# startup using the identity above, so no secret material is ever written
# into the Container App's own definition or Terraform state.
#
# Secret names must be lowercase-hyphenated per Container Apps' naming
# rules, but env var names (the map keys) need to stay as-is (e.g.
# DATABASE_URL) so the app can read them via process.env. This local
# derives a compliant secret name from each key without renaming the
# env var itself.
locals {
  key_vault_secret_names = {
    for k in keys(var.key_vault_secrets) : k => lower(replace(k, "_", "-"))
  }
}

resource "azurerm_container_app" "this" {
  name                         = var.name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = var.container_app_environment_id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.this.id]
  }

  registry {
    server   = var.container_registry_login_server
    identity = azurerm_user_assigned_identity.this.id
  }

  dynamic "secret" {
    for_each = var.key_vault_secrets
    content {
      name                = local.key_vault_secret_names[secret.key]
      identity            = azurerm_user_assigned_identity.this.id
      key_vault_secret_id = secret.value
    }
  }

  template {
    # Scale to zero: the whole point of Consumption-plan Container Apps for
    # a low-volume launch. Cold start adds latency to the first request
    # after idle, which is an accepted tradeoff for cost at this stage.
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = "api"
      image  = var.container_image
      cpu    = var.cpu
      memory = var.memory

      dynamic "env" {
        for_each = var.environment_variables
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.key_vault_secrets
        content {
          name        = env.key
          secret_name = local.key_vault_secret_names[env.key]
        }
      }

      liveness_probe {
        transport = "HTTP"
        path      = "/api/health"
        port      = 3001
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3001
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  tags = var.tags
}
