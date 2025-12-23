# infra/terraform/aws/variables.tf
# Input variables for AWS infrastructure

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "analytics"
}

# =============================================================================
# Networking
# =============================================================================
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# =============================================================================
# ECS Configuration
# =============================================================================
variable "api_image" {
  description = "Docker image for the API container"
  type        = string
  default     = "amazon/amazon-ecs-sample"
}

variable "api_cpu" {
  description = "CPU allocation for API task (in CPU units, 256 = 0.25 vCPU)"
  type        = string
  default     = "512"
}

variable "api_memory" {
  description = "Memory allocation for API task (in MiB)"
  type        = string
  default     = "1024"
}

# =============================================================================
# Database Configuration
# =============================================================================
variable "database_type" {
  description = "Database type: 'rds' for PostgreSQL, 'dynamodb' for DynamoDB"
  type        = string
  default     = "dynamodb"

  validation {
    condition     = contains(["rds", "dynamodb"], var.database_type)
    error_message = "Database type must be 'rds' or 'dynamodb'."
  }
}

variable "db_password" {
  description = "Database password (required if database_type is 'rds')"
  type        = string
  default     = ""
  sensitive   = true
}

# =============================================================================
# CORS Configuration
# =============================================================================
variable "allowed_origins" {
  description = "CORS allowed origins for the API"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

