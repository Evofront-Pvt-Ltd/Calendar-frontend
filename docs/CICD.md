# Calendar Frontend CI/CD

This repository deploys only the Calendar frontend. Backend, MongoDB, and the private registry live in `Calendar-backend`.

## Hostnames

These hostnames follow the existing Pods Civo ingress IP `212.2.249.45` and [nip.io](https://nip.io/) resolution used by `Evofront-Pvt-Ltd/Pods-Frontend`.

| Surface | URL |
| --- | --- |
| Frontend | `https://calendar.212.2.249.45.nip.io` |
| Backend API | `https://calendar-api.212.2.249.45.nip.io` |
| Private registry | `https://calendar-registry.212.2.249.45.nip.io` |

If the Civo load-balancer IP changes, update `k8s/ingress.yaml` and `.github/workflows/calendar-frontend-ci-cd.yml`.

## GitHub secrets

Create these repository secrets on `Evofront-Pvt-Ltd/Calendar-frontend`:

| Secret | Required | Purpose |
| --- | --- | --- |
| `KUBECONFIG` | Yes | Existing Pods Civo kubeconfig, raw YAML or base64 YAML |
| `REGISTRY_USERNAME` | Yes | htpasswd username for the in-cluster registry |
| `REGISTRY_PASSWORD` | Yes | htpasswd password for the in-cluster registry |

`GITHUB_TOKEN` is sufficient for checkout. No extra GitHub PAT is required.

## Branch

Push CI/CD changes to `develop`. Do not change the default branch.

## Bootstrap order

1. Apply the private registry from `Calendar-backend/k8s/registry`.
2. Confirm `https://calendar-registry.212.2.249.45.nip.io/v2/` returns HTTP 401 with a valid Let's Encrypt certificate.
3. Store the GitHub secrets above.
4. Push this repository's `develop` branch.

## Obtaining kubeconfig

In the Civo dashboard, open the existing Pods Kubernetes cluster and download kubeconfig. Store the file contents as the `KUBECONFIG` GitHub Actions secret. Do not commit the file. Do not print it.

Recommended later hardening: create a kubeconfig for the `calendar-cicd` ServiceAccount in `k8s/rbac.yaml` instead of using a cluster-admin kubeconfig.
