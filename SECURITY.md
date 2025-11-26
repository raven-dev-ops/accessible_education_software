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

At this stage:

- **Authentication & roles**
  - Auth0 is used for authentication.
  - Roles are derived only from trusted token claims (`roles` or a configured namespaced claim), and pages are guarded by role on the frontend.
- **Secrets**
  - All secrets (Auth0, database, OCR endpoints) are provided via environment variables and are never committed to the repository.
- **Uploads & OCR**
  - File uploads are accepted via Next.js API routes and forwarded to the OCR service only when `OCR_SERVICE_URL` is configured.
  - OCR results are currently returned to the caller and/or logged in development; persistence and access control will be tightened as we move toward production.
- **Database**
  - Prisma is used as an ORM for PostgreSQL.
  - API routes that touch the database handle errors gracefully and fall back to mock data; no stack traces are returned to clients.
  - Runtime JavaScript/TypeScript dependencies are kept free of known vulnerabilities (`npm audit --omit=dev` reports 0 issues); any remaining advisories relate only to development tooling (for example, linting packages) and are tracked here and/or in Dependabot with appropriate dismissal reasons.

Before any production deployment with real users or student data, we plan to:

- Add stricter access control on API routes in addition to UI-level guards.
- Review file upload limits and content validation.
- Harden the OCR service deployment (network boundaries, authentication, and rate limiting).
- Conduct a targeted security review, including dependency and configuration auditing.
