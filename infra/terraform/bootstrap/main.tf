# One-time bootstrap stack for admissions-backend-apis.
# Apply this ONCE from your laptop before any GitHub Actions workflow can run.
#
# Reuses the same Terraform state bucket + lock table created by the predictors
# bootstrap stack — they're shared infra, not per-repo. If those don't exist yet,
# run the predictors bootstrap first.
#
# Provisions only the GH OIDC role for THIS repo (trust policy is repo-scoped).

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "github_owner" {
  type = string
}

variable "github_repo" {
  type    = string
  default = "admissions-backend-apis"
}

variable "github_oidc_provider_arn" {
  description = "ARN of the existing GitHub OIDC provider (output by the predictors bootstrap). Leave empty to create a new one."
  type        = string
  default     = ""
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project   = "admission-buddy"
      Component = "bootstrap"
      Service   = "admissions-backend-apis"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

# Create the OIDC provider only if the predictors bootstrap didn't already make one.
resource "aws_iam_openid_connect_provider" "github" {
  count = var.github_oidc_provider_arn == "" ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

locals {
  oidc_provider_arn = (
    var.github_oidc_provider_arn != ""
    ? var.github_oidc_provider_arn
    : aws_iam_openid_connect_provider.github[0].arn
  )
}

data "aws_iam_policy_document" "assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_owner}/${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "github-actions-${var.github_repo}"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid    = "Ecr"
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
      "ecr:DescribeRepositories",
      "ecr:CreateRepository",
      "ecr:PutLifecyclePolicy",
      "ecr:GetLifecyclePolicy",
      "ecr:PutImageScanningConfiguration",
      "ecr:DescribeImages",
      "ecr:ListImages",
      "ecr:BatchDeleteImage",
      "ecr:DeleteRepository",
      "ecr:TagResource",
      "ecr:UntagResource",
      "ecr:ListTagsForResource",
      "ecr:GetRepositoryPolicy",
      "ecr:SetRepositoryPolicy",
    ]
    resources = ["*"]
  }
  statement {
    sid    = "Lambda"
    effect = "Allow"
    actions = [
      "lambda:GetFunction*",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
      "lambda:PublishVersion",
      "lambda:CreateFunction",
      "lambda:DeleteFunction",
      "lambda:ListVersionsByFunction",
      "lambda:AddPermission",
      "lambda:RemovePermission",
      "lambda:GetPolicy",
      "lambda:TagResource",
      "lambda:UntagResource",
      "lambda:ListTags",
    ]
    resources = ["*"]
  }
  statement {
    sid    = "ApiGateway"
    effect = "Allow"
    actions = ["apigateway:*"]
    resources = ["*"]
  }
  statement {
    sid    = "Iam"
    effect = "Allow"
    actions = [
      "iam:GetRole",
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:PassRole",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:GetRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:ListRolePolicies",
      "iam:TagRole",
      "iam:UntagRole",
    ]
    resources = ["*"]
  }
  statement {
    sid    = "Logs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:DeleteLogGroup",
      "logs:DescribeLogGroups",
      "logs:PutRetentionPolicy",
      "logs:TagResource",
      "logs:UntagResource",
      "logs:ListTagsForResource",
      "logs:ListTagsLogGroup",
    ]
    resources = ["*"]
  }
  statement {
    sid    = "TfState"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = [
      "arn:aws:s3:::admissions-tfstate",
      "arn:aws:s3:::admissions-tfstate/*",
    ]
  }
  statement {
    sid       = "TfLocks"
    effect    = "Allow"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
    resources = ["arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/admissions-tfstate-locks"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "deploy"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.deploy.json
}

output "github_actions_role_arn" {
  description = "Set as GitHub repo secret AWS_DEPLOY_ROLE_ARN."
  value       = aws_iam_role.github_actions.arn
}

output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}
