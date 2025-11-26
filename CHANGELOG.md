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
