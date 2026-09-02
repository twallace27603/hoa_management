# Burstable B1ms: cheapest general-purpose tier, appropriate for the
# low-volume launch. Public network access is enabled with
# "allow Azure services" only + enforced SSL, because the Container Apps
# Consumption plan (no VNet integration in v1) has no stable outbound IP to
# firewall-allowlist. See docs/security.md for the private-networking
# upgrade path once volume/budget justify a NAT gateway or VNet-integrated
# environment.
resource "azurerm_postgresql_flexible_server" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location

  sku_name   = "B_Standard_B1ms"
  storage_mb = 32768
  version    = "16"

  administrator_login    = var.administrator_login
  administrator_password = var.administrator_password

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  tags = var.tags

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_configuration" "require_ssl" {
  name      = "require_secure_transport"
  server_id = azurerm_postgresql_flexible_server.this.id
  value     = "ON"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.this.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.this.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}
