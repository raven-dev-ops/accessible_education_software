# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - Day 2

- Initialize monorepo structure with `apps` and `packages`.
- Scaffold Next.js web app placeholder with role-based dashboards.
- Add OCR service skeleton and sample OCR test script placeholder.
- Add documentation stubs (privacy policy, terms of service).
- Configure basic tooling and ignore files.

## [0.1.1] - Day 2 security & docs

- Document security posture and CodeQL/code scanning setup in `README.md`.
- Add `NEXT_PUBLIC_AUTH_ENABLED` flag and document how to keep the Netlify login page in "Coming Soon" mode until Auth0 is wired.
- Update `.env.local.example` and `netlify.toml` with the new auth toggle and environment variable guidance.
- Mitigate the `glob` advisory in the dev toolchain (ESLint) while keeping runtime dependencies free of known vulnerabilities (`npm audit --omit=dev` clean).

## [0.1.2] - Day 3

- Wire `/api/upload` to forward files to the OCR service when `OCR_SERVICE_URL` is set, using a configurable temporary upload directory.
- Upgrade the admin upload experience with inline OCR previews, accessible status messaging, and clearer live-vs-stub indicators.
- Capture the math handling plan (MathML-first with screen reader fallbacks) in `README.md`.
