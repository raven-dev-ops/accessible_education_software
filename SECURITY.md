# Security Policy

This project is currently in **early development** and is not yet intended for use with real student or production data. However, we still take security seriously and want to handle potential issues responsibly.

## Supported versions

During the MVP build-out, only the `main` branch and the most recent tagged release (e.g. `v0.1.x`) are considered for security fixes.

## Reporting a vulnerability

If you believe you have found a security vulnerability in this repository or in any of its deployment configurations:

1. Use the **“Report a vulnerability”** link under the **Security** tab of this GitHub repository to open a private security advisory, **or**
2. If that is not available, open a new GitHub issue and:
   - Do **not** include any secrets, tokens, or real student data in the issue body.
   - Clearly label the issue as a security concern in the title.

Please include as much detail as you can:

- Steps to reproduce
- Expected vs. actual behavior
- Any relevant logs or stack traces (with secrets/identifiers redacted)

We will:

- Acknowledge receipt of your report as soon as reasonably possible.
- Investigate and, where appropriate, patch the issue and issue a new release.
- Coordinate disclosure timing with you if the issue is significant.

## Current security posture (MVP phase)

At this stage (current `cs-poc` deployment):

- **Authentication & roles**
  - NextAuth with Google is used for authentication.
  - Roles are derived from email allowlists (`ADMIN_EMAILS`, `TEACHER_EMAILS`) and pages are guarded by role on the frontend; key API routes also enforce server-side checks when auth is enabled.
- **Secrets**
  - All secrets (OAuth, optional database URL, OCR endpoints, API keys) are provided via environment variables and are never committed to the repository.
- **Uploads & OCR**
  - File uploads are accepted via Next.js API routes and forwarded to the OCR service only when `OCR_SERVICE_URL` is configured.
  - OCR results are currently returned to the caller and/or logged in development; persistence is limited to Cloud Storage attachments/exports when a bucket is configured.
- **Database / storage**
  - Prisma and PostgreSQL are documented as an optional data layer; in the active `cs-poc` deployment **no relational database is configured** and Next.js API routes fall back to bundled sample JSON, with Cloud Storage as the only persistence for attachments/exports.
  - Runtime JavaScript/TypeScript dependencies are kept free of known vulnerabilities (`npm audit --omit=dev` reports 0 issues); any remaining advisories relate only to development tooling (for example, linting packages) and are tracked here and/or in Dependabot with appropriate dismissal reasons.

- **Math inference (DeepSeekMath)**
  - The math inference service (`apps/math_inference`) uses pinned versions of `transformers` and related libraries. When Dependabot reports security advisories (for example, ReDoS issues in specific `transformers` versions), the pinned version is updated to the first patched release (currently `transformers==4.53.0`), and the Docker image is rebuilt via Cloud Build. Future advisories for this service should be handled by bumping the pinned versions in `apps/math_inference/requirements.txt` and redeploying.

Before any production deployment with real users or student data, we plan to:

- Add stricter access control on API routes in addition to UI-level guards.
- Review file upload limits and content validation.
- Harden the OCR service and web deployments (network boundaries, authentication, and rate limiting) on GKE/Cloud Run.
- Conduct a targeted security review, including dependency and configuration auditing.
