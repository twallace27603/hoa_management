output "api_fqdn" {
  value = module.container_app_api.fqdn
}

output "frontend_default_hostname" {
  value = module.static_web_app.default_host_name
}

output "container_registry_login_server" {
  value = module.container_registry.login_server
}

output "static_web_app_api_key" {
  value     = module.static_web_app.api_key
  sensitive = true
}
