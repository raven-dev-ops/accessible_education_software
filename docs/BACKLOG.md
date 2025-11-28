# Backlog (post-feature-freeze)

Near-term
- Wire real OCR endpoint/proxy to Netlify (via Cloud Run API) and remove sample fallbacks.
- Add automated AXE/Pa11y checks and Lighthouse budget to CI.
- Improve math speech rules (nemeth/MathML) and TTS voice selection persistence.
- Attachment previews for admin/teacher tickets with inline thumbnails (done for admin; extend elsewhere).
- DB-driven modules/notes for teacher/student dashboards with pagination.

Later
- Full WCAG 2.1 AA audit and remediation.
- Performance tuning: image optimization audit, bundle analysis, caching for API routes.
- Offline/error states for mobile; add retry/backoff for API calls.
- End-to-end tests (Playwright/Cypress) covering auth, uploads, and OCR proxy flows.
- Observability: log shipping for OCR/Cloud Run, metrics on OCR accuracy and Braille usage.
