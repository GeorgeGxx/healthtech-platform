resource "azurerm_kubernetes_cluster" "this" {
  name                = "${var.name}-${var.environment}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.name}-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                 = "system"
    vm_size              = var.node_vm_size
    vnet_subnet_id       = var.subnet_id
    node_count           = var.node_count
    min_count            = var.enable_auto_scaling ? var.min_count : null
    max_count            = var.enable_auto_scaling ? var.max_count : null
    auto_scaling_enabled = var.enable_auto_scaling
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
    network_policy = "azure"
  }

  # Enables Azure AD Workload Identity - the Azure equivalent of AWS IRSA,
  # used for pod-level access to Key Vault, ACR, or other Azure services
  # without static credentials.
  oidc_issuer_enabled               = true
  workload_identity_enabled         = true
  role_based_access_control_enabled = true
  azure_policy_enabled              = var.azure_policy_enabled
  private_cluster_enabled           = var.private_cluster_enabled

  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  dynamic "key_vault_secrets_provider" {
    for_each = var.key_vault_secrets_provider_enabled ? [1] : []
    content {
      secret_rotation_enabled = true
    }
  }

  api_server_access_profile {
    authorized_ip_ranges = var.private_cluster_enabled ? null : var.api_server_authorized_ip_ranges
  }

  node_provisioning_profile {
    mode = "Manual"
  }

  tags = var.tags
}
