# Free tier: no SLA and no staging environments, but zero cost and
# sufficient for a low-volume launch. Upgrade to Standard ($9/mo) once
# custom domain + PR preview environments are needed.
resource "azurerm_static_web_app" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku_tier            = var.sku_tier
  sku_size            = var.sku_tier
  tags                = var.tags
}
