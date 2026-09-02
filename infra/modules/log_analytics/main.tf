resource "azurerm_log_analytics_workspace" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "PerGB2018"
  # Short retention: keep the cost-critical default low; raise later if
  # audit/compliance needs longer log retention.
  retention_in_days = 30
  tags              = var.tags
}
