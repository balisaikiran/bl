# infra/terraform/azure/variables.tf
# Input variables for Azure infrastructure

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "analytics"
}

# =============================================================================
# Container App Configuration
# =============================================================================
variable "api_image" {
  description = "Docker image for the API container"
  type        = string
  default     = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
}

variable "api_cpu" {
  description = "CPU allocation for API container (cores)"
  type        = number
  default     = 0.5
}

variable "api_memory" {
  description = "Memory allocation for API container"
  type        = string
  default     = "1Gi"
}

# =============================================================================
# Database Configuration
# =============================================================================
variable "database_type" {
  description = "Database type: 'sql' for Azure SQL, 'cosmos' for Cosmos DB"
  type        = string
  default     = "cosmos"

  validation {
    condition     = contains(["sql", "cosmos"], var.database_type)
    error_message = "Database type must be 'sql' or 'cosmos'."
  }
}

variable "sql_admin_password" {
  description = "SQL Server admin password (required if database_type is 'sql')"
  type        = string
  default     = ""
  sensitive   = true
}

# =============================================================================
# API Management
# =============================================================================
variable "enable_apim" {
  description = "Enable Azure API Management"
  type        = bool
  default     = false
}

variable "apim_publisher_email" {
  description = "Publisher email for API Management"
  type        = string
  default     = "admin@example.com"
}

# =============================================================================
# CORS Configuration
# =============================================================================
variable "allowed_origins" {
  description = "CORS allowed origins for the API"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

