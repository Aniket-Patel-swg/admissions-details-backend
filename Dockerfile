# Build & deploy as an AWS Lambda container image (API Gateway in front).
# Uses AWS Lambda Web Adapter so the Express app runs unchanged on Lambda.

# ---------- Stage 1: build (TypeScript -> bundled JS) ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

# Bundle src/server.ts into a single dist/server.mjs for fast cold-starts.
# `axios` and `cheerio` are kept external (cheerio pulls iconv-lite/safer-buffer
# which doesn't bundle cleanly under ESM, mirroring serverless.yml).
RUN npx esbuild src/server.ts \
      --bundle \
      --platform=node \
      --target=node20 \
      --format=esm \
      --outfile=dist/server.mjs \
      --sourcemap \
      --external:axios \
      --external:cheerio \
      --external:express

# Production node_modules (only `express`, `axios`, `cheerio`, `random-ipv4` are needed at runtime).
RUN npm prune --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime

# AWS Lambda Web Adapter: turns API Gateway events into HTTP requests on $PORT.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.0 /lambda-adapter /opt/extensions/lambda-adapter

ENV NODE_ENV=production \
    PORT=8080 \
    AWS_LWA_PORT=8080 \
    AWS_LWA_INVOKE_MODE=buffered \
    AWS_LWA_READINESS_CHECK_PATH=/health

WORKDIR /var/task

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/server.mjs"]
