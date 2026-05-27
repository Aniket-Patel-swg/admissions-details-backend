data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.region
  image_uri  = "${aws_ecr_repository.this.repository_url}:${var.image_tag}"
}

# ---------------------------------------------------------------------------
# ECR
# ---------------------------------------------------------------------------

resource "aws_ecr_repository" "this" {
  name                 = var.service_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Retain only the ${var.ecr_image_retention_count} most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = var.ecr_image_retention_count
      }
      action = { type = "expire" }
    }]
  })
}

# ---------------------------------------------------------------------------
# IAM for Lambda
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${var.service_name}-lambda-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# When predictors flip to AWS_IAM auth, this lets the backend invoke them with SigV4.
resource "aws_iam_role_policy" "invoke_predictors" {
  count = length(var.predictor_lambda_arns) > 0 ? 1 : 0
  name  = "invoke-predictors"
  role  = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "lambda:InvokeFunctionUrl"
      Resource  = var.predictor_lambda_arns
      Condition = { StringEquals = { "lambda:FunctionUrlAuthType" = "AWS_IAM" } }
    }]
  })
}

# ---------------------------------------------------------------------------
# CloudWatch log group
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.service_name}"
  retention_in_days = var.log_retention_days
}

# ---------------------------------------------------------------------------
# Lambda (container image)
# ---------------------------------------------------------------------------

resource "aws_lambda_function" "this" {
  function_name                  = var.service_name
  role                           = aws_iam_role.lambda_exec.arn
  package_type                   = "Image"
  image_uri                      = local.image_uri
  memory_size                    = var.memory_size
  timeout                        = var.timeout
  architectures                  = [var.architecture]
  reserved_concurrent_executions = var.reserved_concurrent_executions

  environment {
    variables = merge(
      { PORT = "8080" },
      var.env_vars,
    )
  }

  # CI rolls images via `aws lambda update-function-code`; ignore drift.
  lifecycle {
    ignore_changes = [image_uri]
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_cloudwatch_log_group.this,
  ]
}

# ---------------------------------------------------------------------------
# API Gateway (HTTP API) -> Lambda
# ---------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "this" {
  name          = var.service_name
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.cors_allow_origins
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
    max_age       = 86400
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.this.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}

# Catch-all route: every method/path goes to the same Lambda; Express routes inside.
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}
