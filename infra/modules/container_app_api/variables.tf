variable "name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "container_app_environment_id" {
  type = string
}

variable "container_registry_id" {
  type = string
}

variable "container_registry_login_server" {
  type = string
}

variable "container_image" {
  type        = string
  description = "Full image reference, e.g. myregistry.azurecr.io/hoa-api:sha-abc123."
}

variable "key_vault_id" {
  type = string
}

variable "storage_account_id" {
  type = string
}

variable "key_vault_secrets" {
  type        = map(string)
  description = "Map of environment-variable-name => Key Vault secret ID (versioned URI)."
  default     = {}
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "min_replicas" {
  type    = number
  default = 0
}

variable "max_replicas" {
  type    = number
  default = 3
}

variable "cpu" {
  type    = number
  default = 0.5
}

variable "memory" {
  type    = string
  default = "1Gi"
}

variable "tags" {
  type    = map(string)
  default = {}
}
