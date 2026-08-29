# Calendar Frontend Deployment

GitOps deployment for the Calendar frontend on the Civo `pods-cluster` using **GitHub Actions + Docker Hub + Argo CD**.

## Architecture

```text
develop push
  -> GitHub Actions CI (typecheck, build, validate)
  -> push image to Docker Hub as <username>/calendar-frontend:<git-sha>
  -> commit k8s/overlays/staging/kustomization.yaml
  -> Argo CD syncs k8s/overlays/staging to namespace calendar-frontend
```

Argo CD owns cluster deployment. GitHub Actions does **not** run `kubectl apply` during normal releases.

## URLs

| Surface | URL |
| --- | --- |
| Frontend | `https://calendar.212.2.249.45.nip.io` |
| Backend API | `https://calendar-api.212.2.249.45.nip.io` |

If the Civo ingress IP changes, update `k8s/base/ingress.yaml` and the workflow build args in `.github/workflows/calendar-frontend-ci-cd.yml`.

## GitHub repository secrets

Configure these on `Evofront-Pvt-Ltd/Calendar-frontend`:

| Secret | Required | Purpose |
| --- | --- | --- |
| `DOCKERHUB_USERNAME` | Yes | Docker Hub account used to publish images |
| `DOCKERHUB_PASSWORD` | Yes | Docker Hub password or access token |
| `GITHUB_TOKEN` | Built-in | Used to commit manifest image updates |

## One-time cluster bootstrap

Complete these steps on the shared Civo `pods-cluster` **before** creating Argo CD applications.

### 0. Create namespaces first

If you have not created the backend namespace yet, run this on the backend repo machine or any machine with `pods-cluster` kubeconfig access:

```powershell
kubectl create namespace calendar-backend --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace calendar-frontend --dry-run=client -o yaml | kubectl apply -f -
kubectl get namespace calendar-backend calendar-frontend
```

Both namespaces must show `Active` before continuing.

### 1. Create Docker Hub pull secret in the frontend namespace

```powershell
kubectl create namespace calendar-frontend --dry-run=client -o yaml | kubectl apply -f -
kubectl -n calendar-frontend create secret docker-registry dockerhub-pull `
  --docker-server=https://index.docker.io/v1/ `
  --docker-username="<DOCKERHUB_USERNAME>" `
  --docker-password="<DOCKERHUB_PASSWORD>" `
  --dry-run=client -o yaml | kubectl apply -f -
```

### 2. Register the Argo CD application

```powershell
kubectl apply -f k8s/argocd/application.yaml
```

Or create the app in the Argo CD UI with:

- Repository: `https://github.com/Evofront-Pvt-Ltd/Calendar-frontend.git`
- Branch: `develop`
- Path: `k8s/overlays/staging`
- Namespace: `calendar-frontend`

### 3. Deploy backend first

The frontend image bakes in `NEXT_PUBLIC_API_URL` at build time. Ensure the backend is healthy at `https://calendar-api.212.2.249.45.nip.io` before validating the frontend.

### 4. Push to `develop`

The workflow will:

1. Run typecheck/build/container validation
2. Push `DOCKERHUB_USERNAME/calendar-frontend:<full-git-sha>`
3. Commit `deploy: set frontend image to <short-sha>`
4. Let Argo CD roll out the new image

## Rollback

Preferred rollback is Git-based:

1. Revert the manifest commit in `k8s/overlays/staging/kustomization.yaml`, or
2. Set `newTag` to the previous known-good Git SHA and push

Emergency cluster rollback:

```powershell
kubectl -n calendar-frontend rollout undo deployment/calendar-frontend
```

## Branch policy

Push CI/CD changes to `develop`.
