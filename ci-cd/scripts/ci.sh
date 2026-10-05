#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_SHA:?GITHUB_SHA is required}"
: "${IMAGE_NAME:?IMAGE_NAME is required}"
: "${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL is required}"

npm ci && npx next typegen && npm run typecheck && npm run build
