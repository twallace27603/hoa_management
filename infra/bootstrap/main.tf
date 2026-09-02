# Creates the storage account that holds Terraform remote state for every
# other config in this repo. Run this ONCE per Azure subscription, manually,
# with local state (there's no remote state for the thing that creates
# remote state). After it succeeds, `terraform state list` here is the
# source of truth for this storage account — don't recreate it elsewhere.
#
# Usage:
#   cd infra/bootstrap
#   terraform init
#   terraform apply -var="subscription_id=<sub-id>"

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

variable "subscription_id" {
  type        = string
  description = "Azure subscription ID to bootstrap state storage in."
}

variable "location" {
  type    = string
  default = "eastus2"
}

resource "azurerm_resource_group" "state" {
  name     = "rg-hoa-mgmt-tfstate"
  location = var.location
}

resource "azurerm_storage_account" "state" {
  name                            = "sthoamgmttfstate"
  resource_group_name             = azurerm_resource_group.state.name
  location                        = azurerm_resource_group.state.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false

  blob_properties {
    versioning_enabled = true
  }
}

resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_id    = azurerm_storage_account.state.id
  container_access_type = "private"
}

output "storage_account_name" {
  value = azurerm_storage_account.state.name
}

output "container_name" {
  value = azurerm_storage_container.tfstate.name
}

output "resource_group_name" {
  value = azurerm_resource_group.state.name
}
