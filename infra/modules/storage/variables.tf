variable "name" {
  type        = string
  description = "Storage account name (globally unique, lowercase alphanumeric, <=24 chars)."
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "container_names" {
  type    = list(string)
  default = ["documents", "arc-attachments", "violation-photos"]
}

variable "tags" {
  type    = map(string)
  default = {}
}
