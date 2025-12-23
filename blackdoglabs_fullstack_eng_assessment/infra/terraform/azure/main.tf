# infra/terraform/azure/main.tf
# Azure infrastructure for Analytics Platform
# Don't deploy - just ensure it's plan-ready.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }

  # Uncomment for remote state
  # backend "azurerm" {
  #   resource_group_name  = "rg-terraform-state"
  #   storage_account_name = "stterraformstate"
  #   container_name       = "tfstate"
  #   key                  = "analytics-platform.tfstate"
  # }
}

provider "azurerm" {
  features {}
}

# =============================================================================
# Local variables
# =============================================================================
locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# =============================================================================
# Resource Group
# =============================================================================
resource "azurerm_resource_group" "main" {
  name     = "rg-${local.resource_prefix}"
  location = var.location
  tags     = local.common_tags
}

# =============================================================================
# Log Analytics (for Container Apps and monitoring)
# =============================================================================
resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = var.environment == "prod" ? 90 : 30
  tags                = local.common_tags
}

# =============================================================================
# Container App Environment
# =============================================================================
resource "azurerm_container_app_environment" "main" {
  name                       = "cae-${local.resource_prefix}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags                       = local.common_tags
}

# =============================================================================
# Container App - API
# =============================================================================
resource "azurerm_container_app" "api" {
  name                         = "ca-${local.resource_prefix}-api"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = local.common_tags

  template {
    min_replicas = var.environment == "prod" ? 2 : 1
    max_replicas = var.environment == "prod" ? 10 : 3

    container {
      name   = "api"
      image  = var.api_image
      cpu    = var.api_cpu
      memory = var.api_memory

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "LOG_LEVEL"
        value = var.environment == "prod" ? "INFO" : "DEBUG"
      }

      # Reference secrets from Key Vault via managed identity
      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      liveness_probe {
        path             = "/health"
        port             = 8000
        transport        = "HTTP"
        initial_delay    = 10
        interval_seconds = 30
      }

      readiness_probe {
        path             = "/health"
        port             = 8000
        transport        = "HTTP"
        initial_delay    = 5
        interval_seconds = 10
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8000
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  secret {
    name  = "database-url"
    value = "placeholder-use-key-vault-reference"
  }

  identity {
    type = "SystemAssigned"
  }
}

# =============================================================================
# Key Vault (secrets management)
# =============================================================================
data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                       = "kv-${var.project_name}-${var.environment}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = var.environment == "prod"
  tags                       = local.common_tags

  # Deployer access
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = ["Get", "List", "Set", "Delete", "Recover", "Backup", "Restore"]
  }
}

# API managed identity access to Key Vault (least privilege - read only)
resource "azurerm_key_vault_access_policy" "api" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_container_app.api.identity[0].principal_id

  secret_permissions = ["Get", "List"]
}

# =============================================================================
# Azure SQL Database (Option 1)
# =============================================================================
resource "azurerm_mssql_server" "main" {
  count                        = var.database_type == "sql" ? 1 : 0
  name                         = "sql-${local.resource_prefix}"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"
  tags                         = local.common_tags

  azuread_administrator {
    login_username = "AzureAD Admin"
    object_id      = data.azurerm_client_config.current.object_id
  }
}

resource "azurerm_mssql_database" "main" {
  count     = var.database_type == "sql" ? 1 : 0
  name      = "sqldb-${local.resource_prefix}"
  server_id = azurerm_mssql_server.main[0].id
  sku_name  = var.environment == "prod" ? "S1" : "Basic"
  tags      = local.common_tags
}

# =============================================================================
# Cosmos DB (Option 2 - for flexible schema / high write throughput)
# =============================================================================
resource "azurerm_cosmosdb_account" "main" {
  count               = var.database_type == "cosmos" ? 1 : 0
  name                = "cosmos-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"
  tags                = local.common_tags

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.main.location
    failover_priority = 0
  }

  capabilities {
    name = "EnableServerless"
  }
}

resource "azurerm_cosmosdb_sql_database" "main" {
  count               = var.database_type == "cosmos" ? 1 : 0
  name                = "analytics"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main[0].name
}

resource "azurerm_cosmosdb_sql_container" "events" {
  count               = var.database_type == "cosmos" ? 1 : 0
  name                = "events"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main[0].name
  database_name       = azurerm_cosmosdb_sql_database.main[0].name
  partition_key_path  = "/org_id"

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/org_id/?"
    }

    included_path {
      path = "/user_id/?"
    }

    included_path {
      path = "/event_type/?"
    }

    included_path {
      path = "/timestamp/?"
    }

    excluded_path {
      path = "/properties/*"
    }
  }
}

# =============================================================================
# API Management (optional - for rate limiting, caching, policies)
# =============================================================================
resource "azurerm_api_management" "main" {
  count               = var.enable_apim ? 1 : 0
  name                = "apim-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  publisher_name      = "Analytics Platform"
  publisher_email     = var.apim_publisher_email
  sku_name            = var.environment == "prod" ? "Standard_1" : "Consumption_0"
  tags                = local.common_tags
}

