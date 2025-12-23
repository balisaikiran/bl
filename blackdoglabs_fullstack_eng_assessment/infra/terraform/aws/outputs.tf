# infra/terraform/aws/outputs.tf
# Output values for AWS infrastructure

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "api_endpoint" {
  description = "URL of the API endpoint (ALB DNS)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.api.name
}

output "secrets_manager_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.api_secrets.arn
}

output "cloudwatch_log_group" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.api.name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

# Database outputs (conditional)
output "database_connection_info" {
  description = "Database connection information"
  value = var.database_type == "rds" ? {
    type     = "RDS PostgreSQL"
    endpoint = try(aws_db_instance.main[0].endpoint, null)
    database = try(aws_db_instance.main[0].db_name, null)
  } : {
    type       = "DynamoDB"
    table_name = try(aws_dynamodb_table.events[0].name, null)
    table_arn  = try(aws_dynamodb_table.events[0].arn, null)
  }
  sensitive = true
}

# Network info for debugging
output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

