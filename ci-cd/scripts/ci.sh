#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_SHA:?GITHUB_SHA is required}"
: "${IMAGE_NAME:?IMAGE_NAME is required}"
: "${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL is required}"

npm ci && npx next typegen && npm run typecheck && npm run build
docker build \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
  --build-arg NEXT_PUBLIC_ORGANIZATION_EMAIL_DOMAIN="${NEXT_PUBLIC_ORGANIZATION_EMAIL_DOMAIN:-evofront.com}" \
  --build-arg NEXT_PUBLIC_LANDING_WIDGET_ID= \
  -t "${IMAGE_NAME}:${GITHUB_SHA}" .
