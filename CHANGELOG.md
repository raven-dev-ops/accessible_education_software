# Changelog

# Changelog

All notable changes to this project will be documented in this file.

## [0.2.2] - M4 docs & braille/db polish

- Added `docs/M4.md` to document the Prisma schema (core models, migrations, seeds) and the Braille prototype path with liblouis/fallback configuration.
- Secured temp-file cleanup in support ticket uploads and normalized admin ticket previews (attachment-aware).
- Version bumps to 0.2.2 to mark M4 completion.

## [0.2.1] - Cloud Run proxy + WIF

- Add a Cloud Run API scaffold (`apps/cloud-run-api`) that connects to the private-IP Cloud SQL instance via the Cloud SQL Connector, guarded by an `X-API-Key`.
- Configure a Serverless VPC Access connector (`serverless-sql-connector`) for private DB access.
- Set up Workload Identity Federation for GitHub Actions (pool `gh-pool`, provider `gh-provider`) to impersonate `cloud-run-invoker` (roles/run.invoker) and call the Cloud Run API with OIDC tokens instead of service account keys.
- Document the Cloud Run/WIF flow and current Cloud SQL connection details.

## [0.2.0] - Day 5 auth swap

- Replace Auth0 with NextAuth + Google provider (new `/api/auth/[...nextauth].ts`, email allowlists for admin/teacher roles, login/logout flows updated across pages/components).
- Update env templates and Netlify guidance for NextAuth/Google (`NEXTAUTH_URL/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ADMIN_EMAILS`, `TEACHER_EMAILS`, `NEXT_PUBLIC_AUTH_ENABLED`).
- Provision Cloud SQL Postgres instance (private IP) and document proxy requirement for Netlify access.

## [0.1.5] - Day 4 data layer

- Extend Prisma schema with `Upload` model and `Note.ocrText`, and add a migration to capture file metadata and OCR text.
- `/api/upload` now persists upload metadata/OCR text to Postgres when `DATABASE_URL` is configured, while keeping the existing OCR proxy and stub behavior.
- Document new env options and keep Braille/liblouis work from 0.1.4.

## [0.1.4] - Day 4 follow-ups

- Add server-side Braille API hook with optional liblouis/Nemeth output and client fallback messaging.
- Wire the student Braille preview to consume the API and show status/errors while keeping the Grade 1 fallback.
- Check in the initial Prisma migration (PostgreSQL) and update docs for Braille configuration and migrations.

## [0.1.3] - Day 4

- Add reusable Web Speech helper and student dashboard playback for sample and released notes with accessible status updates.
- Introduce a Braille prototype with Grade 1 mapping and `.brf` preview/download hooks on the student dashboard.
- Document the Prisma schema and database setup steps for the initial Postgres-backed data layer.

## [0.1.2] - Day 3

- Wire `/api/upload` to forward files to the OCR service when `OCR_SERVICE_URL` is set, using a configurable temporary upload directory.
- Upgrade the admin upload experience with inline OCR previews, accessible status messaging, and clearer live-vs-stub indicators.
- Capture the math handling plan (MathML-first with screen reader fallbacks) in `README.md`.

## [0.1.1] - Day 2 security & docs

- Document security posture and CodeQL/code scanning setup in `README.md`.
- Add `NEXT_PUBLIC_AUTH_ENABLED` flag and document how to keep the Netlify login page in "Coming Soon" mode until Auth0 is wired.
- Update `.env.local.example` and `netlify.toml` with the new auth toggle and environment variable guidance.
- Mitigate the `glob` advisory in the dev toolchain (ESLint) while keeping runtime dependencies free of known vulnerabilities (`npm audit --omit=dev` clean).

## [0.1.0] - Day 2

- Initialize monorepo structure with `apps` and `packages`.
- Scaffold Next.js web app placeholder with role-based dashboards.
- Add OCR service skeleton and sample OCR test script placeholder.
- Add documentation stubs (privacy policy, terms of service).
- Configure basic tooling and ignore files.
