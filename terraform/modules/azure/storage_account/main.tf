resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  clean_name           = replace(var.name, "-", "")
  storage_account_name = substr("${local.clean_name}${var.environment}${random_string.suffix.result}", 0, 24)
}

# nosemgrep: terraform.azure.security.storage.storage-allow-microsoft-service-bypass.storage-allow-microsoft-service-bypass, terraform.azure.security.storage.storage-queue-services-logging.storage-queue-services-logging
resource "azurerm_storage_account" "this" {
  name                     = local.storage_account_name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier                      = var.account_tier
  account_replication_type          = var.account_replication_type
  min_tls_version                   = "TLS1_2"
  infrastructure_encryption_enabled = true

  identity {
    type = "SystemAssigned"
  }

  dynamic "customer_managed_key" {
    for_each = var.customer_managed_key != null ? [var.customer_managed_key] : []
    content {
      key_vault_key_id          = customer_managed_key.value.key_vault_key_id
      user_assigned_identity_id = customer_managed_key.value.user_assigned_identity_id
    }
  }

  blob_properties {
    versioning_enabled = true
    delete_retention_policy {
      days = 30
    }
  }

  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }

  tags = var.tags
}

resource "azurerm_storage_container" "containers" {
  for_each              = toset(var.containers)
  name                  = each.key
  storage_account_id    = azurerm_storage_account.this.id
  container_access_type = "private"
}
