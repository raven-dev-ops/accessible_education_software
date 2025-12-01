# Release plan (container/Kubernetes releases)

Pre-flight
- CI green on main (`.github/workflows/ci.yml`, `post-deploy-smoke.yml`).
- Cloud Build images green (`cloudbuild-docker.yaml`), pushing `accessible-web` and `accessible-backend` to Artifact Registry.
- GKE manifests up to date (`k8s/namespace.yaml`, `k8s/*-config.yaml`, `k8s/*-deployment.yaml`) and apply cleanly to `accessible-cluster`.
- Secrets set for auth/AI/infra hooks; no secrets in client bundles or repo.

Cutting a release
- Tag format: `vX.Y.Z` (or `vX.Y.Z-rcN` for candidates). Current: `v1.2.0`.
- Verify changelog entry and versions in `package.json` / `apps/web/package.json` if bumping.
- Push tag; `release-and-package.yml` creates a GitHub Release and publishes the shared package to GitHub Packages.

Post-release
- Smoke test production: `/login`, `/student`, `/teacher`, `/admin` on the live frontend (GKE LoadBalancer or Cloud Run URL).
- Check Cloud Build logs for image builds and confirm new pods are running/Ready in `accessible-cluster` (`kubectl get pods -n accessible`).
- Monitor OCR/API logs (GKE and/or Cloud Run) for errors; roll back to the previous tag if needed.

Backlog capture
- Track remaining items in `docs/BACKLOG.md` after feature freeze.
- For client handover, prepare access list (GitHub, Cloud Build, GKE, Cloud Run, Cloud Storage, optional DB) and rotate any temporary secrets.

