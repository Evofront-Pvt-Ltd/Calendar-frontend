#!/usr/bin/env bash
set -euo pipefail

: "${FRONTEND_URL:?FRONTEND_URL is required}"

{
  echo "## Deployed URL"
  echo ""
  echo "| Surface | URL |"
  echo "| --- | --- |"
  echo "| Frontend | ${FRONTEND_URL} |"
} >> "${GITHUB_STEP_SUMMARY}"
