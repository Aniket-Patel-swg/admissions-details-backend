output "aws_account_id" {
  value = local.account_id
}

output "aws_region" {
  value = local.region
}

output "ecr_repository_url" {
  value = aws_ecr_repository.this.repository_url
}

output "ecr_repository_name" {
  value = aws_ecr_repository.this.name
}

output "lambda_function_name" {
  value = aws_lambda_function.this.function_name
}

output "lambda_function_arn" {
  value = aws_lambda_function.this.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_exec.arn
}

output "api_endpoint" {
  description = "Public HTTPS base URL of the API Gateway HTTP API. Plug this into the frontend's NEXT_PUBLIC_API_BASE_URL."
  value       = aws_apigatewayv2_api.this.api_endpoint
}
