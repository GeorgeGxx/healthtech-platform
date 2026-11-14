variable "name" {
  type = string
}

variable "environment" {
  type = string
}

variable "location" {
  type    = string
  default = "eastus"
}

variable "resource_group_name" {
  type = string
}

variable "kubernetes_version" {
  type    = string
  default = "1.30"
}

variable "subnet_id" {
  type = string
}

variable "node_vm_size" {
  type    = string
  default = "Standard_D2s_v5"
}

variable "node_count" {
  type    = number
  default = 2
}

variable "min_count" {
  type    = number
  default = 1
}

variable "max_count" {
  type    = number
  default = 4
}

variable "enable_auto_scaling" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "api_server_authorized_ip_ranges" {
  description = "The IP ranges to allow for incoming traffic to the API server."
  type        = list(string)
  default     = ["10.0.0.0/8"]
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID for AKS Container Insights (OMS Agent)."
  type        = string
  default     = null
}

variable "azure_policy_enabled" {
  description = "Enable Azure Policy add-on for AKS governance."
  type        = bool
  default     = true
}

variable "private_cluster_enabled" {
  description = "Enable private AKS API server endpoint (requires VNet-integrated runner)."
  type        = bool
  default     = false
}

variable "key_vault_secrets_provider_enabled" {
  description = "Enable Azure Key Vault Provider for Secrets Store CSI Driver."
  type        = bool
  default     = true
}
