#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_SHA:?GITHUB_SHA is required}"
: "${DOCKERHUB_USERNAME:?DOCKERHUB_USERNAME is required}"
: "${DOCKERHUB_PASSWORD:?DOCKERHUB_PASSWORD is required}"
: "${IMAGE_NAME:?IMAGE_NAME is required}"
: "${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL is required}"

docker build \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
  --build-arg NEXT_PUBLIC_ORGANIZATION_EMAIL_DOMAIN="${NEXT_PUBLIC_ORGANIZATION_EMAIL_DOMAIN:-evofront.com}" \
  --build-arg NEXT_PUBLIC_LANDING_WIDGET_ID= \
  -t "${IMAGE_NAME}:${GITHUB_SHA}" .

REMOTE="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${GITHUB_SHA}"
docker tag "${IMAGE_NAME}:${GITHUB_SHA}" "${REMOTE}"
docker push "${REMOTE}"
docker manifest inspect "${REMOTE}" >/dev/null

python3 ci-cd/scripts/set_deployment_image.py "${DOCKERHUB_USERNAME}/${IMAGE_NAME}" "${GITHUB_SHA}"
bash ci-cd/scripts/ensure_dockerhub_pull_secret.sh calendar-frontend
export KUBECONFIG="$HOME/.kube/config"
kubectl apply -k k8s/overlays/staging
