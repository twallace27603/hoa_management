# Every container is private; the API mints short-lived SAS URLs for
# authorized reads/writes (see apps/api/src/storage/storage.service.ts).
# The API's managed identity is granted "Storage Blob Data Contributor"
# (see envs/dev) so it can generate user-delegation SAS tokens without a
# stored account key.
resource "azurerm_storage_account" "this" {
  name                            = var.name
  resource_group_name             = var.resource_group_name
  location                        = var.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  tags                            = var.tags
}

resource "azurerm_storage_container" "containers" {
  for_each              = toset(var.container_names)
  name                  = each.value
  storage_account_id    = azurerm_storage_account.this.id
  container_access_type = "private"
}
