# Release plan (M10 / v1.0.0 target)

Pre-flight
- CI green on main (`.github/workflows/ci.yml`).
- Netlify env configured (see `docs/NETLIFY.md`); production branch enforcement on.
- OCR/Cloud Run reachable from Netlify (or fallback behavior documented).
- Secrets set for auth/DB/AI hooks; no secrets in client bundles.

Cutting a release
- Tag format: `vX.Y.Z` (or `vX.Y.Z-rcN` for candidates).
- Verify changelog entry and versions in `package.json` / `apps/web/package.json` if bumping.
- Push tag → `release-and-package.yml` creates GitHub Release and publishes shared package to GH Packages.

Post-release
- Smoke test production: `/login`, `/student`, `/teacher`, `/admin`.
- Check Netlify deploy logs for errors; confirm functions directory and publish dir are correct.
- Monitor OCR/API logs (Cloud Run) for errors; roll back to previous tag if needed.

Backlog capture
- Track remaining items in `docs/BACKLOG.md` after feature freeze.
- For client handover, prepare access list (Netlify, GitHub, Cloud Run, DB) and rotate any temporary secrets.
