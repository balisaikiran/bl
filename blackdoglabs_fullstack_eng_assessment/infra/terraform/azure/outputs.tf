# infra/terraform/azure/outputs.tf
# Output values for Azure infrastructure

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "api_endpoint" {
  description = "URL of the API endpoint"
  value       = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "container_app_environment_id" {
  description = "ID of the Container App Environment"
  value       = azurerm_container_app_environment.main.id
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

output "api_managed_identity_principal_id" {
  description = "Principal ID of the API's managed identity"
  value       = azurerm_container_app.api.identity[0].principal_id
}

# Database outputs (conditional)
output "database_connection_info" {
  description = "Database connection information"
  value = var.database_type == "sql" ? {
    type   = "Azure SQL"
    server = try(azurerm_mssql_server.main[0].fully_qualified_domain_name, null)
    database = try(azurerm_mssql_database.main[0].name, null)
  } : {
    type     = "Cosmos DB"
    endpoint = try(azurerm_cosmosdb_account.main[0].endpoint, null)
    database = try(azurerm_cosmosdb_sql_database.main[0].name, null)
  }
  sensitive = true
}

# API Management (conditional)
output "apim_gateway_url" {
  description = "API Management gateway URL"
  value       = var.enable_apim ? azurerm_api_management.main[0].gateway_url : null
}

