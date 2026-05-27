variable "service_name" {
  type    = string
  default = "admissions-backend-apis"
}

variable "image_tag" {
  description = "ECR image tag the Lambda points to. CI overrides on every deploy."
  type        = string
  default     = "latest"
}

variable "memory_size" {
  type    = number
  default = 512
}

variable "timeout" {
  description = "Lambda timeout in seconds. API Gateway HTTP API hard ceiling is 30."
  type        = number
  default     = 29
}

variable "architecture" {
  type    = string
  default = "arm64"
  validation {
    condition     = contains(["x86_64", "arm64"], var.architecture)
    error_message = "architecture must be either 'x86_64' or 'arm64'."
  }
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "ecr_image_retention_count" {
  type    = number
  default = 10
}

variable "reserved_concurrent_executions" {
  type    = number
  default = -1
}

variable "cors_allow_origins" {
  description = "Origins allowed by API Gateway CORS. Set to your frontend domain in prod."
  type        = list(string)
  default     = ["*"]
}

variable "predictor_lambda_arns" {
  description = "ARNs of the predictor Lambdas this backend invokes (Function URLs with AWS_IAM auth)."
  type        = list(string)
  default     = []
}

variable "env_vars" {
  description = "Extra env vars (e.g. predictor URLs)."
  type        = map(string)
  default     = {}
}
