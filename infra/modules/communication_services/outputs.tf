output "connection_string" {
  value     = azurerm_communication_service.this.primary_connection_string
  sensitive = true
}

output "sender_address" {
  value = "DoNotReply@${azurerm_email_communication_service_domain.managed.mail_from_sender_domain}"
}
