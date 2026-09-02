resource "azurerm_container_registry" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  # Basic tier: cheapest, no geo-replication/private endpoints, sufficient
  # for one team pushing a handful of images at low frequency.
  sku           = "Basic"
  admin_enabled = false
  tags          = var.tags
}
