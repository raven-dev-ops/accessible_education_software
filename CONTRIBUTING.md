# Contributing & Workflow

This repository is organized around milestones (M1–M10) and anchor issues.
The goal is to keep work small, traceable, and aligned to the 30‑day MVP
plan for the Accessible Education Software project.

## Milestones and anchor issues

- Milestones represent major phases: foundation, auth, OCR wiring, TTS/DB,
  Alpha, Beta, hardening, packaging, and MVP handover.
- Each milestone has 3–5 anchor issues (prefixed with `M{n}: ...`) that
  describe the key outcomes for that phase.
- When you start work, pick an anchor issue for the current milestone and
  either:
  - implement it directly in a single PR, or
  - create smaller child issues that link back to the anchor issue.

You can view milestones and issues at:
- https://github.com/raven-dev-ops/accessible_education_software/milestones

## Labels

We use a small, focused label set:

- `frontend` – Next.js UI, dashboards, theming, client logic.
- `backend-ocr` – Python OCR service, Tesseract, AI hooks.
- `a11y` – Accessibility (WCAG, screen readers, Braille, keyboard flows).
- `devops` – CI/CD, Netlify, Docker, release automation.
- `docs` – README, guides, onboarding, legal/policy docs.

Default GitHub labels like `bug`, `enhancement` and `documentation` are
still available. New issues should usually have **one area label** and
optionally `bug` / `enhancement`.

## Branch and PR guidelines

- Create feature branches per issue: `feat/mX-short-slug` or
  `chore/mX-short-slug` (e.g. `feat/m3-ocr-upload-proxy`).
- Reference the issue in the PR title and description, e.g.
  - `M3: Wire /api/upload to OCR service (#7)`
- Keep PRs small and focused on a single anchor issue when possible.

## Testing & checks

- For frontend changes, run at least:
  - `npm test` (runs `next lint` for `apps/web`).
  - `npm run build:web` before merging larger changes.
- For OCR backend changes, run:
  - `pip install -r apps/ocr_service/requirements.txt`
  - `npm run test:ocr` (or `pytest` once tests exist).
- CI will run tests/builds for PRs and block merges on failures.

## Accessibility first

This project targets blind and low‑vision students. When in doubt:

- Prefer semantic HTML, clear headings, and ARIA only when needed.
- Ensure keyboard access and visible focus states for new components.
- Consider screen reader and Braille users when adding interactions.

If you are unsure about an accessibility trade‑off, capture it in the
relevant `a11y` issue and leave a note in the PR.

