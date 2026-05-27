# admissions-backend-apis

Node 20 / TypeScript HTTP API for Admission Buddy. Deploys to AWS Lambda (container image) behind API Gateway HTTP API. CI/CD is GitHub Actions.

```
GitHub Repo
   ↓ push to main
GitHub Actions
   ↓
Build Docker Image  (esbuild bundle → node:20-alpine + AWS Lambda Web Adapter)
   ↓
Push to AWS ECR
   ↓
Terraform Apply  (idempotent: ECR + Lambda + API Gateway HTTP API + IAM + log group)
   ↓
aws lambda update-function-code  (rolls the new image; TF ignores image_uri)
```

## How it runs on Lambda

There are 16 route handlers (`src/handlers/**`), all written as `APIGatewayProxyHandler`. Instead of registering them as 16 separate Lambdas, we mount each one as an Express route in `src/server.ts` via a thin `lambdaToExpress()` adapter (`src/lib/lambda-express-adapter.ts`). Handler code is **unchanged**.

```
API Gateway HTTP API ── ANY /{proxy+} ─→ Lambda (container)
                                         └─ AWS Lambda Web Adapter
                                            └─ Express on :8080
                                               └─ lambdaToExpress(handler)
                                                  └─ existing handler
```

The Web Adapter (extension layer in the image) translates each API Gateway invocation into a local HTTP request, so Express runs exactly like it does in dev.

## Local development

Two ways:

1. **Serverless Offline** (existing flow, function-per-handler):
   ```bash
   npm run dev    # http://localhost:4802
   ```
2. **Docker (mirrors prod 1:1)**:
   ```bash
   docker build -t admissions-backend-apis .
   docker run --rm -p 8080:8080 \
     -e COLLEGE_PREDICTOR_URL=https://... \
     -e MARKS_PREDICTOR_URL=https://... \
     -e PERCENTILE_PREDICTOR_URL=https://... \
     admissions-backend-apis
   curl http://localhost:8080/admissions-deadline
   ```

## One-time bootstrap (do this once, from your laptop)

> Prerequisite: the predictors bootstrap stack (`admissions-predictoins/infra/terraform/bootstrap`) has already been applied — that creates the shared `admissions-tfstate` S3 bucket + DynamoDB lock table + GitHub OIDC provider.

```bash
cd infra/terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars
#   set github_owner, paste github_oidc_provider_arn from predictors bootstrap output
terraform init
terraform apply
#   → copy `github_actions_role_arn` and `aws_account_id`
```

In **GitHub → Settings → Secrets and variables → Actions**, add:

| Secret name           | Value                                    |
| --------------------- | ---------------------------------------- |
| `AWS_ACCOUNT_ID`      | from bootstrap output                    |
| `AWS_DEPLOY_ROLE_ARN` | `github_actions_role_arn` from bootstrap |

## First deploy

The very first `terraform apply` needs an image to exist in ECR. Two-step:

```bash
# Step 1 — create just the ECR repo (locally, one time):
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply -target=aws_ecr_repository.this

# Step 2 — push code to main (or trigger workflow_dispatch).
#   The deploy workflow:
#     - builds + pushes the image
#     - runs `terraform apply` (creates Lambda + API Gateway)
#     - rolls the new image in via `aws lambda update-function-code`

# Step 3 — read the API Gateway URL from the workflow summary
#   (or from `terraform output api_endpoint`) and put it in the frontend's env.
```

## Day-to-day flow

| You did this                              | What happens                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| Edit any handler in `src/handlers/...`    | `deploy.yml` runs → tests → image build/push → terraform apply → Lambda updated   |
| Add a new route                           | Add the handler + a line in `src/server.ts`. Push. CI handles the rest.           |
| Change Lambda memory / timeout / env_vars | Edit `infra/terraform/terraform.tfvars` (or `variables.tf`). Push. CI re-applies. |
| Manual redeploy needed                    | Actions tab → **deploy** workflow → **Run workflow**                              |

## Connecting predictor URLs

After predictor stacks are deployed (in the `admissions-predictoins` repo), grab their `lambda_function_url` outputs and put them in this stack's `terraform.tfvars`:

```hcl
env_vars = {
  COLLEGE_PREDICTOR_URL    = "https://xxxxx.lambda-url.ap-south-1.on.aws/"
  MARKS_PREDICTOR_URL      = "https://yyyyy.lambda-url.ap-south-1.on.aws/"
  PERCENTILE_PREDICTOR_URL = "https://zzzzz.lambda-url.ap-south-1.on.aws/"
}
```

If/when you flip the predictors to `authorization_type = "AWS_IAM"`, also set:

```hcl
predictor_lambda_arns = [
  "arn:aws:lambda:ap-south-1:<acct>:function:college-predictor",
  "arn:aws:lambda:ap-south-1:<acct>:function:marks-predictor",
  "arn:aws:lambda:ap-south-1:<acct>:function:guject-percentile-predictor",
]
```

— that grants this Lambda's role `lambda:InvokeFunctionUrl` on those ARNs. The Node clients will need `aws4-axios` to sign the outbound requests; see `admissions-predictoins/infra/terraform/README.md` for the snippet.

## Layout

```
admissions-backend-apis/
├── src/
│   ├── handlers/                 # 16 unchanged APIGatewayProxyHandler functions
│   ├── lib/lambda-express-adapter.ts  # bridges Express ↔ APIGatewayProxyEvent
│   └── server.ts                 # Express app, mounts each handler at its route
├── Dockerfile                    # node:20-alpine + AWS Lambda Web Adapter
├── infra/terraform/
│   ├── bootstrap/                # one-time GH OIDC role for this repo
│   ├── main.tf                   # ECR + Lambda + API Gateway + IAM + logs
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── .github/workflows/deploy.yml  # the pipeline
├── serverless.yml                # kept for `npm run dev` (serverless-offline) only
└── package.json
```
