# accessible-education-software

> AI-powered, accessible STEM note system that turns handwritten calculus notes into readable, listenable content for blind and low-vision students.

`accessible-education-software` is an AI-assisted accessibility platform focused on college-level STEM courses, starting with **Calculus I** (see the content repo at https://github.com/raven-dev-ops/ocr_calculus_1).

The system helps **students**, **teachers**, and **site admins** work with handwritten notes and course materials by:

- Converting images/PDFs of handwritten notes into machine-readable text
- Using AI to verify and improve OCR output (especially math notation)
- Providing a path to audio/text-to-speech for blind and low-vision students
- Supporting role-based workflows and scheduling of course content

---

## Table of Contents

- [Features](#features)
- [Status (Day 5)](#status-day-5)
- [Roles](#roles)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Clone the repo](#clone-the-repo)
  - [Install dependencies](#install-dependencies)
- [Environment variables](#environment-variables)
- [Run the apps](#run-the-apps)
- [Mock Data (Day 2)](#mock-data-day-2)
- [Math handling (Day 3)](#math-handling-day-3)
- [Braille path (Day 4)](#braille-path-day-4)
- [APIs & Database](#apis--database)
- [Security & Code Scanning](#security--code-scanning)
- [Accessibility](#accessibility)
- [Roadmap](#roadmap)
- [Project Workflow](#project-workflow)
- [Contributing](#contributing)
- [License](#license)
- [Legal & Privacy](#legal--privacy)

---

## Features

### Current & Planned (MVP)

- **Calculus I OCR module**
  - Upload handwritten calculus notes (images/PDFs)
  - Convert to text (via OCR), with future support for LaTeX/MathML
  - Read output via text-to-speech (planned)

- **AI-assisted OCR verification (planned)**
  - Compare OCR output to the original image
  - Suggest corrections, especially for math notation and symbols
  - Allow professor-specific tuning based on handwriting samples

- **Role-based dashboards**
  - **Student dashboard**
    - Upload handwritten notes
    - Attach short notes (up to **500 words**)
    - Access teacher-released course materials
    - TTS sample (voice search, volume, countdown, prev/next), Braille preview, support ticket submission (OCR issues; attachments to GCS when configured)
  - **Teacher dashboard**
    - Upload materials (images/PDFs), attach detailed notes (up to **2000 words**)
    - Module-aware training checklist (per-equation upload/status/editable OCR text)
    - AI chat placeholder for module/OCR Q&A
    - Support ticket review table: view attachment/score/status, close/escalate
  - **Admin dashboard**
    - View student information
    - Monitor system logs and analytics (planned)
    - See sample support tickets and links to dashboards

- **Authentication with Google (NextAuth)**
  - Google-backed login via NextAuth
  - Role-based routing (Student / Teacher / Admin) derived from email allowlists

- **Monorepo architecture**
  - **Next.js** frontend: lightweight, accessible UI (target deployment on Netlify)
  - **Backend OCR service**: Python + Tesseract (planned deployment on Google Cloud / Heroku)
  - **PostgreSQL** database: hosted on Google Cloud
  - Shared utilities and types for consistency

- **Accessibility-first UI**
  - Light and dark mode with **pastel** color palette
  - Screen-reader friendly layout
  - Keyboard-navigable flows
  - Designed with blind and low-vision users in mind

---

## Status (Week 1)

- Version **0.3.x**: Google OAuth via NextAuth; role-based routing; Cloud SQL (Postgres) private IP.
- Student dashboard: low-vision friendly layout, collapsible accessibility widget, TTS voice/volume prefs, multi-paragraph sample (prev/next, countdown), Braille preview, support tickets with attachment upload to GCS (when configured).
- Teacher dashboard: profile card, module-aware training checklist (per-equation upload/status/editable OCR text), AI chat placeholder, course upload, support ticket review table (pulls `/api/support-tickets`, view/close/escalate).
- Admin dashboard: students/uploads with sample fallback; sample support tickets; logout fixed in light mode.

---

## Roles

### Students

- Log in securely
- Upload handwritten notes for OCR
- Attach short context notes (up to 500 words)
- Access released course material from professors
- Listen to audio versions of notes (planned)

### Teachers

- Log in securely
- Upload handwritten or typed course materials
- Attach up to 2000 words of explanatory notes
- Choose auto-release schedules or manual release
- Review and respond to student submissions (planned)

### Site Admins

- View lists of students and basic info
- Monitor platform usage, logs, and analytics (planned)
- Help ensure privacy, security, and accessibility standards

---

## Tech Stack

**Frontend**

- Next.js (React)
- NextAuth (authentication via Google)
- Tailwind CSS or similar (utility-first styling, to be wired in)
- Light/Dark mode with pastel theming

**Backend**

- Python service (FastAPI/Flask-style) for OCR
- PyTesseract (Tesseract OCR)
- Optionally Node/Express for additional APIs or orchestration

**Database**

- PostgreSQL on Google Cloud (Cloud SQL)

**Infrastructure / Deployment**

- Frontend: Netlify (auto-deploy on main)
- Backend: Google Cloud (Cloud Run / App Engine) or Heroku (planned)
- Auth: Google OAuth client via NextAuth

---

## Architecture

At a high level:

- **Next.js frontend**
  - Handles login via NextAuth (Google)
  - Routes users to `/student`, `/teacher`, or `/admin` dashboards
  - Provides file upload forms and displays processed content

- **Backend OCR + AI service**
  - Accepts file uploads (images/PDFs)
  - Converts PDFs to images as needed
  - Runs OCR with Tesseract (via PyTesseract)
  - (Planned) Calls AI models to verify and improve OCR output
  - Stores metadata and text in Postgres

- **PostgreSQL**
  - Users, roles, and profiles
  - Courses/modules (e.g. “Calculus I”)
  - Notes and OCR outputs
  - Release schedules and logs

- **Authentication (NextAuth + Google)**
  - Handles authentication flows (sign-in, sign-out, callback)
  - Uses a Google OAuth client; roles are derived from email allowlists (`ADMIN_EMAILS`, `TEACHER_EMAILS`)

---

## Project Structure

```text
accessible-education-software/
  apps/
    web/                # Next.js app (Student/Teacher/Admin UI)
      pages/            # /, /login, /dashboard, /admin, /teacher, /student, /status
      components/       # Shared layout and UI components
      data/             # Mock data for Day 2 (e.g. sampleStudents.json)
      lib/              # Frontend utilities (e.g. role and API auth helpers, TTS)
    ocr_service/        # Python FastAPI OCR skeleton (PyTesseract)
      main.py           # FastAPI app with /health and /ocr endpoints
      sample_ocr_test.py
      requirements.txt
  packages/
    shared/             # Shared utilities and future types
      package.json      # Published to GitHub Packages on tagged releases
  docs/
    PRIVACY_POLICY.md
    TERMS_OF_SERVICE.md
  .github/
    workflows/          # CodeQL and release/package workflows
  CHANGELOG.md
  CONTRIBUTING.md
  .gitignore
  README.md
  LICENSE               # All rights reserved
  package.json          # Root workspace and scripts
```

---

## Getting Started

### Prerequisites

- Node.js **18+**
- npm **9+** (or recent that ships with Node 18)
- Python **3.9+** for the OCR service
- (For OCR testing) Tesseract installed on your system

### Clone the repo

```bash
git clone https://github.com/raven-dev-ops/accessible_education_software.git
cd accessible_education_software
```

### Install dependencies

At the monorepo root:

```bash
npm install
```

For the OCR service, install Python deps:

```bash
pip install -r apps/ocr_service/requirements.txt
```

### Environment variables

Frontend (`apps/web/.env.local` for local, `.env` for Netlify):

- `NEXTAUTH_URL` – site origin (e.g. `http://localhost:3000` or `https://accessibilitysoftware.netlify.app`).
- `NEXTAUTH_SECRET` – random long secret for NextAuth session encryption.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – Google OAuth client credentials.
- `ADMIN_EMAILS` / `TEACHER_EMAILS` – optional comma-separated allowlists; everyone else is treated as `student`.
- `NEXT_PUBLIC_AUTH_ENABLED` – `true` to require Google login; `false` shows the "Coming Soon" placeholder.
- `NEXT_PUBLIC_SHOW_STAGING_BANNER` – show a visible "staging" banner on that deploy.
- `NEXT_PUBLIC_ENV_LABEL` – optional label shown on `/status` (e.g. `staging`, `prod-coming-soon`, `local`).
- `OCR_SERVICE_URL` – base URL for the Python OCR service (e.g. `http://localhost:8000`).
- `DATABASE_URL` – PostgreSQL connection string used by Prisma. Cloud SQL is private-IP only; use Cloud SQL Auth Proxy/connector from Netlify/functions or a reachable proxy endpoint.
- `BRAILLE_ENGINE` (optional) – set to `liblouis` to enable server-side liblouis/Nemeth output for `/api/braille`; defaults to the fallback Grade 1 mapper.
- `BRAILLE_LIBLOUIS_TABLE` (optional) – liblouis table to use (e.g. `nemeth`); defaults to `nemeth` when `BRAILLE_ENGINE=liblouis`.
- `BRAILLE_LIBLOUIS_BIN` (optional) – path to the `lou_translate` binary if it is not on your PATH.

### Run the apps

Additional frontend env flags (set in `apps/web/.env.local` for local development, and in Netlify environment variables for the deployed web app):

- `NEXT_PUBLIC_AUTH_ENABLED` - `true`/`1` enables Google login; `false`/unset shows the "Login – Coming Soon" placeholder.
- `NEXT_PUBLIC_SHOW_STAGING_BANNER` - when enabled, displays a visible "Staging environment – for testing only" banner (use this on the staging Netlify site).
- `NEXT_PUBLIC_ENV_LABEL` - optional string used by `/status` to identify the environment (for example `staging`, `prod-coming-soon`, or `local`).

Run the web app (Next.js dev server):

```bash
npm run dev:web
```

Run the OCR service locally:

```bash
npm run dev:ocr
```

Run a simple OCR smoke test:

```bash
npm run test:ocr
```

---

### Google OAuth / NextAuth setup

1. **OAuth client (already provisioned)**
   - Client ID: `a7e9753a3-293b-4ea2-b108-ba02da5b041e`
   - Redirect URIs: `https://accessibilitysoftware.netlify.app/api/auth/callback`, `https://accessibilitysoftware.netlify.app/api/auth/callback/google`, `http://localhost:3000/api/auth/callback`, `http://localhost:3000/api/auth/callback/google`
2. **Configure env vars**
   - Set `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in Netlify and `.env.local`.
   - Turn on `NEXT_PUBLIC_AUTH_ENABLED=true` when you want login enforced; leave false for the public placeholder.
   - Set `ADMIN_EMAILS` / `TEACHER_EMAILS` (comma-separated) to grant elevated roles; all others default to `student`.
3. **Local login**
   - Ensure the localhost redirect URIs above are set on the OAuth client (already applied).
   - Run `npm run dev:web`, visit `http://localhost:3000/login`, and sign in with a Google account that matches your allowlist if testing admin/teacher routes.

---

## Mock Data (Day 2)

For early development, the app uses mock data and stubbed APIs:

- `apps/web/data/sampleStudents.json` - sample student records for the admin dashboard.
- `apps/web/pages/api/students.ts` - returns the mock students.
- `apps/web/pages/api/upload.ts` - accepts file uploads, forwards them to the OCR service when `OCR_SERVICE_URL` is configured, and falls back to a stub log-only response otherwise.
- `apps/web/pages/api/test-ocr.ts` - stub endpoint to exercise the OCR pipeline and logs.

These will be replaced with real database and OCR-service-backed implementations as the project progresses.

---

## Math handling (Day 3)

Early plan for representing and rendering math from OCR output:

- Prefer MathML as the canonical format, storing raw OCR text alongside a math-aware string that screen readers can read.
- Keep OCR responses as plain text for now; a later pass will lift math into MathML/LaTeX and attach a spoken-text fallback.
- Render math on the client with a lightweight MathJax setup (MathML-first) while keeping plain-text/ARIA fallbacks for Braille and TTS users.
- Announce OCR success/error states with `aria-live` status messaging so screen readers pick up inline results.

---

## Braille path (Day 4)

- A lightweight Grade 1 Braille mapper lives at `apps/web/lib/braille.ts`, converting ASCII text into Unicode Braille cells and `.brf`-friendly output.
- A liblouis/Nemeth hook is available via `/api/braille` (server-side only). Enable it by installing `liblouis`, setting `BRAILLE_ENGINE=liblouis`, and optionally `BRAILLE_LIBLOUIS_TABLE` (default `nemeth`) / `BRAILLE_LIBLOUIS_BIN` (`lou_translate` by default).
- The student dashboard shows a Braille preview of the latest released note (or a sample) and offers a `.brf` download; it prefers liblouis output when available and falls back to Grade 1 otherwise.
- Next steps: refine math parsing and evaluate a full Nemeth pipeline once OCR math extraction stabilizes.

---

## APIs & Database

Several Next.js API routes power the dashboards:

- `GET /api/students` - returns a list of students for the admin dashboard. Uses the `User` table when the database is configured; otherwise falls back to `apps/web/data/sampleStudents.json`.
- `GET /api/modules` - returns a list of modules for the teacher dashboard. Uses the `Module` and `Course` tables when available; otherwise falls back to `apps/web/data/sampleModules.json`.
- `GET /api/notes` - returns "released materials" for the student dashboard. Uses the `Note`, `Module`, and `Course` tables when available; otherwise falls back to `apps/web/data/sampleNotes.json`.
- `POST /api/upload` - accepts a file upload and, if `OCR_SERVICE_URL` is configured, forwards the file to the Python OCR service `/ocr` endpoint. Returns basic file metadata and any OCR text received.
- `POST /api/test-ocr` - calls the OCR service `/health` endpoint (when `OCR_SERVICE_URL` is set) and reports whether OCR is available; otherwise returns a stub message.

### Cloud SQL and Cloud Run proxy

- Cloud SQL instance: `accessible-software-db` (private IP only) with database `appdb`, users `postgres` and `appuser`.
- A small Cloud Run API (`cloud-run-api`) connects to Cloud SQL over private IP using the Cloud SQL Connector. It is protected by an `X-API-Key` header and intended to be called from CI/Netlify via HTTPS instead of direct DB access.
- Cloud Run URL: `https://cloud-run-api-139864076628.us-central1.run.app`
- API key: set via the `API_KEY` environment variable on the service (see deploy notes below).
- Serverless VPC connector: `serverless-sql-connector` (us-central1) to reach the private IP DB.

### Workload Identity Federation (GitHub Actions)

Netlify cannot emit OIDC tokens, so keyless access is provided through GitHub Actions OIDC:

- WIF pool/provider: `gh-pool` / `gh-provider` (issuer `https://token.actions.githubusercontent.com`) with condition `attribute.repository=='raven-dev-ops/accessible_education_software'`.
- Service account for invocation: `cloud-run-invoker@cs-poc-kvjwpp97kjozemn894cmvvg.iam.gserviceaccount.com` (roles: `run.invoker`, `iam.workloadIdentityUser` bound to the GitHub repo).
- Example GitHub secrets:
  - `WORKLOAD_ID_PROVIDER=projects/139864076628/locations/global/workloadIdentityPools/gh-pool/providers/gh-provider`
  - `SERVICE_ACCOUNT=cloud-run-invoker@cs-poc-kvjwpp97kjozemn894cmvvg.iam.gserviceaccount.com`
  - `CLOUD_RUN_URL=https://cloud-run-api-139864076628.us-central1.run.app`
  - `CLOUD_RUN_API_KEY=<match Cloud Run API_KEY>`
- Workflow outline:
  - Use `google-github-actions/auth@v2` with the WIF provider and service account.
  - Fetch an ID token: `gcloud auth print-identity-token --audiences="${CLOUD_RUN_URL}"`.
  - Call Cloud Run with `Authorization: Bearer <ID_TOKEN>` and `X-API-Key: <API_KEY>`.
- `POST /api/braille` - converts text to Braille using liblouis/Nemeth when enabled (`BRAILLE_ENGINE=liblouis`) and falls back to the Grade 1 mapper otherwise.

### Database & Prisma

Day 4 adds the Prisma schema for the core data model (see `apps/web/prisma/schema.prisma`):

- `User` (with logical roles)
- `Course` and `Module`
- `Note` (linked to modules and users, with optional `ocrText`)
- `Log` (reserved for future observability)
- `Upload` (file metadata, OCR text snapshot, status)

Set up Postgres locally:

1. Configure `DATABASE_URL` in `apps/web/.env.local`, e.g.  
   `DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/accessible_education?schema=public`
2. Apply the checked-in baseline migration (`apps/web/prisma/migrations`):  
   `npx prisma migrate deploy --schema apps/web/prisma/schema.prisma`
3. Generate the Prisma client:  
   `npm run prisma:generate`
4. Seed development data (course, modules, teacher + students, sample note):  
   `npm run seed:dev`

API routes still fall back to mock data when `DATABASE_URL` is not set, so the app runs without a local Postgres instance during early development.

---

## Security & Code Scanning

Security is treated as a first-class concern even during the MVP phase:

- A dedicated security policy lives in `SECURITY.md`, including how to report vulnerabilities and the current MVP security posture.
- GitHub CodeQL is configured via `.github/workflows/codeql.yml` to automatically scan the JavaScript/TypeScript (Next.js) and Python (OCR service) code for common vulnerabilities and coding errors on pushes, pull requests, and a weekly schedule.
- Dependencies are monitored with `npm audit`; production dependencies are currently free of known vulnerabilities, and the `glob` advisory affecting a dev-only ESLint toolchain is mitigated by a top-level override in `package.json`.
- Secrets such as OAuth credentials, database URLs, and OCR service endpoints are injected only via environment variables and are never committed to the repository.
- The `NEXT_PUBLIC_AUTH_ENABLED` flag controls whether the deployed Netlify frontend uses the real Google login flow (`true`/`1`) or shows the "Login – Coming Soon" placeholder (`false`/unset), which should be used for public staging until auth wiring is ready.

Before any real student data is processed in production, the plan is to harden API-level authorization, tighten file upload limits and validation, and perform a focused configuration/dependency review as described in `SECURITY.md`.

Additionally, in this repository:

- The CodeQL workflow installs JavaScript/TypeScript dependencies (`npm install` from the monorepo root) before analysis so that the Next.js app and its TypeScript configuration are available to the analyzer.
- Key API routes such as `/api/students`, `/api/modules`, and `/api/notes` are also protected server-side using NextAuth sessions/roles (when `NEXT_PUBLIC_AUTH_ENABLED` is true), complementing the frontend page guards.

  ---
  
  ## Accessibility

Accessibility is a core requirement, not an afterthought:

- Target users include blind and low-vision students using screen readers and Braille.
- UI is designed for keyboard navigation and clear focus states.
- Pages use semantic HTML and will be validated against WCAG 2.1 AA as the MVP stabilizes.
- Text-to-speech (TTS) and Braille-friendly output are part of the MVP roadmap.

See issues labeled `a11y` in GitHub for specific accessibility tasks and audits.

---

## Roadmap

The project follows a milestone-based plan:

- **M1-M2** - Foundation, repo hygiene, initial auth integration, basic dashboards, theming.
- **M4** - Database foundation + Braille path prototype (see `docs/M4.md` for schema, migrations, and Braille config notes).
- **M5-M7** - Persistence, CI hardening, accessibility polish, OCR robustness, Beta.
- **M8-M10** - Testing, performance, packaging, deployment, and MVP client handover.

The detailed day-by-day plan and milestone goals are reflected in GitHub milestones and issues.

---

## Project Workflow

This project is managed through GitHub milestones and small, focused issues:

- Milestones `M1`–`M10` map to major phases in the 30-day MVP plan
  (foundation, auth, OCR wiring, TTS/DB, Alpha, Beta, hardening, packaging,
  and MVP handover).
- Each milestone has a handful of anchor issues with titles like
  `M3: Wire upload to OCR service` that describe the key outcomes for that phase.
- You can see the full roadmap and current status at the **Milestones** view:
  https://github.com/raven-dev-ops/accessible_education_software/milestones
- Labels indicate the main area of work:
  - `frontend` – dashboards, theming, Next.js UI.
  - `backend-ocr` – OCR service, Tesseract, AI hooks.
  - `a11y` – accessibility, screen readers, WCAG, Braille.
  - `devops` – CI/CD, Netlify, Docker, release automation.
  - `docs` – README, guides, onboarding, legal docs.
  - Tagging a release like `v0.1.0` runs CI and publishes a tagged GitHub Release (see CI/CD overview below).

### CI/CD overview

- **CodeQL code scanning**: the `codeql.yml` workflow runs on pushes and pull requests targeting `main`, plus a weekly scheduled run. It analyzes the JavaScript/TypeScript (Next.js app) and Python (OCR service) code, installing dependencies first so the analyzers see the full project.
- **Release & package**: the `release-and-package.yml` workflow runs when you push a tag matching `v*.*.*`. It runs `npm test` and `npm run build:web`, creates a GitHub Release for that tag, and publishes the shared package `@raven-dev-ops/accessible-education-software-shared` to GitHub Packages.
- **Netlify deploys**: the web frontend is deployed via Netlify, which builds from `apps/web` using `npm run build` (as configured in `netlify.toml`). Updating `main` will typically trigger a new deploy for any Netlify site connected to this repository.

  Even if you are not writing code, you can follow progress by watching which
  milestones and issues move toward completion over time.
  
  ---

## Contributing

For implementation details, branching conventions, and testing expectations,
see `CONTRIBUTING.md` in the repository root. It explains how to:

- Pick a milestone and anchor issue to work on.
- Create feature branches and open focused pull requests.
- Run the basic checks for frontend and OCR service changes.
- Keep accessibility and documentation front-of-mind as you contribute.

---

## License

All rights reserved. See `LICENSE` for details.

---

## Legal & Privacy

Draft legal and policy documents live under `docs/`:

- `docs/PRIVACY_POLICY.md`
- `docs/TERMS_OF_SERVICE.md`

These will be expanded and finalized before any real student data is processed
or the system is deployed in a production environment.

