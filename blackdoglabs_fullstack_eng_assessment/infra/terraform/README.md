# Terraform Infrastructure Options

This folder contains Terraform configurations for deploying the Analytics Platform.

## Choose Your Cloud Provider

### Azure (Preferred)
```bash
cd azure
terraform init
terraform plan -var="environment=dev"
```

### AWS (Alternative)
```bash
cd aws
terraform init
terraform plan -var="environment=dev"
```

## Structure

```
terraform/
├── azure/
│   ├── main.tf           # Azure resources (Container Apps, Key Vault, etc.)
│   ├── variables.tf      # Input variables
│   └── outputs.tf        # Output values
├── aws/
│   ├── main.tf           # AWS resources (ECS/Fargate, Secrets Manager, etc.)
│   ├── variables.tf      # Input variables
│   └── outputs.tf        # Output values
└── README.md             # This file
```

## State Management

For production:
- Use remote state (Azure Storage Account or S3 bucket)
- Use workspaces for environment separation (`terraform workspace new staging`)
- Lock state with DynamoDB (AWS) or Azure blob lease

Example backend configuration:
```hcl
# Azure
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate"
    container_name       = "tfstate"
    key                  = "analytics-platform.tfstate"
  }
}

# AWS
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "analytics-platform/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

## Don't Deploy

This IaC is meant to be **plan-ready**, not deployed. Demonstrate:
- Proper resource configuration
- Least-privilege IAM/RBAC
- Environment parameterization
- Security best practices

