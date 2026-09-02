# A single Consumption-plan Container Apps Environment hosts every
# container app for this deployment. No VNet integration in v1 to avoid the
# cost of a NAT gateway; see docs/security.md for the tradeoff and the
# planned hardening path.
resource "azurerm_container_app_environment" "this" {
  name                       = var.name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  log_analytics_workspace_id = var.log_analytics_workspace_id
  tags                       = var.tags
}
