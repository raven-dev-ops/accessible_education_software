# accessible-education-software

> AI-powered, accessible STEM note system that turns handwritten calculus notes into readable, listenable content for blind and low-vision students.

`accessible-education-software` is an AI-assisted accessibility platform focused on college-level STEM courses, starting with **Calculus I** and designed to extend to additional STEM modules (such as Linear Algebra and Physics).

The system helps **students**, **teachers**, and **site admins** work with handwritten notes and course materials by:

- Converting images/PDFs of handwritten notes into machine-readable text
- Using AI to verify and improve OCR output (especially math notation)
- Providing a path to audio/text-to-speech for blind and low-vision students
- Supporting role-based workflows and scheduling of course content

---

## Table of Contents

- [Features](#features)
  - [Status (v1.3.0)](#status-v130)
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
- [Mock Data (alpha)](#mock-data-day-2)
- [Math handling](#math-handling-day-3)
- [Braille path](#braille-path-day-4)
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
  - **Next.js** frontend: lightweight, accessible UI in `apps/web`, built as a container image and deployed to either **GKE** (`accessible-web` Deployment/Service in `accessible-cluster`, `us-central1-a`) or **Cloud Run** (`accessible-web` in `us-central1`) depending on environment.
  - **Backend OCR service**: Python + Tesseract in `apps/ocr_service`, packaged as a container for **GKE** (`accessible-backend` Deployment/Service) or Cloud Run when needed.
  - **Object storage**: Cloud Storage bucket for attachments, exports, and backups (only active storage in the current `cs-poc` deployment).
  - Shared utilities and types for consistency

- **Accessibility-first UI**
  - Light and dark mode with **pastel** color palette
  - Screen-reader friendly layout
  - Keyboard-navigable flows
  - Designed with blind and low-vision users in mind

---

## Status (v1.3.0)

- Version **1.3.0**: Same MVP scope as 1.0.0 (Google OAuth via NextAuth; student/teacher/admin dashboards) with UI polish from 1.0.1, now fully containerized and deployed to GKE (`accessible-cluster` in `us-central1-a`) as `accessible-web` (Next.js frontend) and `accessible-backend` (Python OCR/logic) services, plus an optional GPU-backed math inference microservice (`accessible-math-inference`) for DeepSeekMath 7B reasoning over OCR math output. Cloud Storage remains the only active storage layer in the current `cs-poc` deployment; Cloud SQL and the `cloud-run-api` bridge are kept as documented, optional paths.
- Student dashboard: low-vision friendly layout, collapsible accessibility widget, TTS sample with voice/volume/rate controls and live word highlighting, Braille preview with liblouis/fallback, OCR MVP demo, and support tickets (including attachments when configured).
  - Teacher dashboard: sample profile, module-aware training checklist (per-equation upload/status/editable OCR text), support ticket review table (view/close/escalate, attachments), course material upload, and AI assistant placeholder.
  - Admin dashboard: system overview cards (student/teacher/admin experience + Cloud Run/backend/OCR health), sample students/uploads/modules, live/preview support tickets, and status cards wired to `/api/*` + `test-ocr`.

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

- Python service (FastAPI) for OCR/logic (`apps/ocr_service`, `accessible-backend`)
- PyTesseract (Tesseract OCR) + PyMuPDF for PDFs
- Optional DeepSeekMath 7B math reasoning service (`apps/math_inference`, `accessible-math-inference`)

**Storage & data**

- Primary persistence: Google Cloud Storage (attachments, exports, backups)

**Infrastructure / Deployment**

- Primary runtime: Kubernetes (GKE) `accessible-cluster` in `us-central1-a` running:
  - `accessible-web` (Next.js) Deployment/Service (LoadBalancer)
  - `accessible-backend` (Python OCR/logic) Deployment/Service (ClusterIP)
  - `accessible-math-inference` (DeepSeekMath 7B) Deployment/Service (ClusterIP) on a GPU node pool (L4), when enabled
- Alternate runtime: Google Cloud Run (`accessible-web` and `accessible-backend` services in `us-central1`) using the same container images when a serverless target is preferred.
- Auth: Google OAuth client via NextAuth
- Hybrid connectivity: HA VPN + Cloud Router (prod/nonprod shared VPCs)

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
  - Can store metadata and text in Postgres when a database is configured; in the current `cs-poc` deployment, durable data is limited to Cloud Storage attachments/exports and API routes fall back to bundled sample JSON.

- **PostgreSQL (optional data layer)**
  - When enabled, stores users, roles, and profiles
  - Courses/modules (e.g. "Calculus I")
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
    ocr_service/        # Python FastAPI OCR/logic service (PyTesseract + PyMuPDF)
      main.py           # FastAPI app with /health, /ocr-file, /ocr-json, /logic endpoints
      sample_ocr_test.py
      requirements.txt
    math_inference/     # DeepSeekMath-backed math reasoning service
      main.py           # FastAPI app with /health and /v1/math-verify
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

Frontend (`apps/web/.env.local` for local, Kubernetes/Cloud Run env vars for production):

- `NEXTAUTH_URL` – site origin (e.g. `http://localhost:3000` or `https://accessible-web-139864076628.us-central1.run.app`).
- `NEXTAUTH_SECRET` – random long secret for NextAuth session encryption.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – Google OAuth client credentials.
- `ADMIN_EMAILS` / `TEACHER_EMAILS` – optional comma-separated allowlists; everyone else is treated as `student`.
- `NEXT_PUBLIC_AUTH_ENABLED` – `true` to require Google login; `false` shows the "Coming Soon" placeholder.
- `NEXT_PUBLIC_SHOW_STAGING_BANNER` – show a visible "staging" banner on that deploy.
- `NEXT_PUBLIC_ENV_LABEL` – optional label shown on `/status` (e.g. `staging`, `prod-coming-soon`, `local`).
- `OCR_SERVICE_URL` - base URL for the Python OCR service (e.g. `http://localhost:8000`).
- `DATABASE_URL` - PostgreSQL connection string used by Prisma for optional relational storage (local Postgres or Cloud SQL via connector/proxy). In the current `cs-poc` deployment this is left unset so APIs run in demo/sample mode and Cloud Storage is the only active persistence layer.
- `BRAILLE_ENGINE` (optional) – set to `liblouis` to enable server-side liblouis/Nemeth output for `/api/braille`; defaults to the fallback Grade 1 mapper.
- `BRAILLE_LIBLOUIS_TABLE` (optional) – liblouis table to use (e.g. `nemeth`); defaults to `nemeth` when `BRAILLE_ENGINE=liblouis`.
- `BRAILLE_LIBLOUIS_BIN` (optional) – path to the `lou_translate` binary if it is not on your PATH.

### Run the apps

Additional frontend env flags (set in `apps/web/.env.local` for local development, and in your deployment environment for the deployed web app-GKE or Cloud Run):

- `NEXT_PUBLIC_AUTH_ENABLED` - `true`/`1` enables Google login; `false`/unset shows the "Login – Coming Soon" placeholder.
- `NEXT_PUBLIC_SHOW_STAGING_BANNER` - when enabled, displays a visible "Staging environment – for testing only" banner (use this on any non-production environment).
- `NEXT_PUBLIC_ENV_LABEL` - optional string used by `/status` to identify the environment (for example `staging`, `prod-coming-soon`, or `local`).

Run the web app (Next.js dev server):

```bash
npm run dev:web
```

Run the OCR service locally:

```bash
npm run dev:ocr
```

Backend OCR/logic (`apps/ocr_service`) also supports:

- `AI_VERIFY_URL` / `AI_VERIFY_API_KEY` – optional external AI verification hook for OCR text.
- `MATH_INFERENCE_URL` – optional URL of the math reasoning service (for example, `http://math-inference.accessible.svc.cluster.local:8000` when running in-cluster). When set, image OCR responses include a `math` block from DeepSeekMath 7B cleanup.

The math inference service (`apps/math_inference`) is typically run only in GPU-capable environments (for example, an L4-backed node pool on GKE). For local experimentation you can set `MATH_MODEL_DEVICE=cpu`, but performance will be limited.

Run a simple OCR smoke test:

```bash
npm run test:ocr
```

---

### Google OAuth / NextAuth setup

1. **OAuth client (already provisioned)**
   - Client ID: `a7e9753a3-293b-4ea2-b108-ba02da5b041e`
   - Redirect URIs should include:
   - `https://accessible-web-139864076628.us-central1.run.app/api/auth/callback`
   - `https://accessible-web-139864076628.us-central1.run.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback`
   - `http://localhost:3000/api/auth/callback/google`
2. **Configure env vars**
   - Set `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in Cloud Run service env vars and `.env.local`.
   - Turn on `NEXT_PUBLIC_AUTH_ENABLED=true` when you want login enforced; leave false for the public placeholder.
   - Set `ADMIN_EMAILS` / `TEACHER_EMAILS` (comma-separated) to grant elevated roles; all others default to `student`.
3. **Local login**
   - Ensure the localhost redirect URIs above are set on the OAuth client (already applied).
   - Run `npm run dev:web`, visit `http://localhost:3000/login`, and sign in with a Google account that matches your allowlist if testing admin/teacher routes.

---

## Mock Data (alpha)

For early development, the app uses mock data and stubbed APIs:

- `apps/web/data/sampleStudents.json` - sample student records for the admin dashboard.
- `apps/web/pages/api/students.ts` - returns the mock students.
- `apps/web/pages/api/upload.ts` - accepts file uploads, forwards them to the OCR service when `OCR_SERVICE_URL` is configured, and falls back to a stub log-only response otherwise.
- `apps/web/pages/api/test-ocr.ts` - stub endpoint to exercise the OCR pipeline and logs.

These will be replaced with real database and OCR-service-backed implementations as the project progresses.

---

## Math handling

Early plan for representing and rendering math from OCR output:

- Prefer MathML as the canonical format, storing raw OCR text alongside a math-aware string that screen readers can read.
- Keep OCR responses as plain text for now; a later pass will lift math into MathML/LaTeX and attach a spoken-text fallback.
- Render math on the client with a lightweight MathJax setup (MathML-first) while keeping plain-text/ARIA fallbacks for Braille and TTS users.
- Announce OCR success/error states with `aria-live` status messaging so screen readers pick up inline results.

---

## Braille path

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
- `POST /api/upload` - accepts a file upload and, if `OCR_SERVICE_URL` is configured, forwards the file to the Python OCR service `/ocr-file` endpoint. Returns basic file metadata and any OCR text received.
- `POST /api/test-ocr` - calls the OCR service `/health` endpoint (when `OCR_SERVICE_URL` is set) and reports whether OCR is available; otherwise returns a stub message.
- `GET /api/status` - returns a summary of app/DB/OCR health (used by admin dashboards and for quick smoke checks).

### Runtime and storage

- GKE: `accessible-cluster` in `us-central1-a` runs the `accessible-web` (LoadBalancer) and `accessible-backend` (ClusterIP) Deployments/Services using the container images built by `cloudbuild-docker.yaml`.
- Cloud Run: `accessible-web` and `accessible-backend` services in `us-central1` remain available as an alternate serverless deployment target; they use the same container images but are no longer the primary path for the `cs-poc` environment.
- No relational database is currently provisioned; Next.js API routes fall back to bundled sample JSON for students/modules/notes when `DATABASE_URL` is unset.
- Support ticket attachments (when enabled via `GCS_BUCKET` and `GCS_SA_KEY`) are stored in Cloud Storage and served via signed URLs.

### Hybrid connectivity (HA VPN)

- VPCs/subnets (custom):
  - `vpc-prod-shared`: `subnet-prod-1` (us-south1, 10.0.0.0/24), `subnet-prod-2` (us-west1, 172.16.0.0/24)
  - `vpc-nonprod-shared`: `subnet-non-prod-1` (us-central1, 10.20.0.0/24), `subnet-non-prod-2` (us-east1, 10.20.1.0/24)
- External VPN gateways (peer side):
  - `codex-prod` interfaces: 34.174.57.86, 34.174.118.154, 136.118.94.166, 34.127.118.116
  - `codex-nonprod` interfaces: 35.238.111.73, 34.172.154.25, 34.23.202.20, 34.26.50.139
- HA VPN gateways (GCP side):
  - Prod: `prod-us-south1-gateway` (if0 34.157.46.58, if1 34.157.174.136), `prod-us-west1-gateway` (if0 34.157.118.77, if1 35.220.53.232)
  - Nonprod: `nonprod-us-central1-gateway` (if0 35.242.125.202, if1 34.153.243.133), `nonprod-us-east1-gateway` (if0 34.152.72.127, if1 34.177.46.140)
- ASNs: prod Cloud ASN 65010 / peer ASN 65020; nonprod Cloud ASN 65030 / peer ASN 65040.
- BGP /30s (GCP/peer):
  - prod us-south1 tnl0 169.254.10.1/30 (peer .2); tnl1 169.254.10.5/30 (peer .6)
  - prod us-west1 tnl0 169.254.11.1/30 (peer .2); tnl1 169.254.11.5/30 (peer .6)
  - nonprod us-central1 tnl0 169.254.20.1/30 (peer .2); tnl1 169.254.20.5/30 (peer .6)
  - nonprod us-east1 tnl0 169.254.21.1/30 (peer .2); tnl1 169.254.21.5/30 (peer .6)
- PSKs are stored in `apps/web/.env` (gitignored). Use IKEv2.
- What’s left on the peer side: set the peer devices to use the above interface IPs, ASNs, PSKs, and /30 link IPs, then advertise on-prem prefixes. BGP should form once the peer brings up the tunnels.

#### Peer-side quick checklist (any vendor)

1) Assign the public IPs above to the peer gateway interfaces (or NAT them to the VPN device).
2) Create two tunnels per region; set IKEv2 and the matching PSK for each tunnel.
3) Set peer ASN to 65020 (prod) or 65040 (nonprod); Cloud side is 65010/65030.
4) Configure BGP neighbors with the /30 link IPs (GCP = `.1`/`.5`, peer = `.2`/`.6` as listed).
5) Advertise on-prem prefixes; accept/allow GCP prefixes (e.g., 10.0.0.0/24, 172.16.0.0/24, 10.20.0.0/24, 10.20.1.0/24, and Cloud SQL 10.10.188.0/24 as needed).
6) Enable keepalives/DPD and allow UDP 500/4500 (and ESP if not NAT-T).
- Cloud Run URL: `https://cloud-run-api-139864076628.us-central1.run.app`
- API key: set via the `API_KEY` environment variable on the service (see deploy notes below).
- Serverless VPC connector: `serverless-sql-connector` (us-central1) to reach the private IP DB.

### Workload Identity Federation (GitHub Actions)

If you use Netlify as a frontend host, note that it cannot emit OIDC tokens; keyless access to Cloud Run is instead provided through GitHub Actions OIDC:

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
- The `NEXT_PUBLIC_AUTH_ENABLED` flag controls whether the deployed web frontend uses the real Google login flow (`true`/`1`) or shows the "Login - Coming Soon" placeholder (`false`/unset), which should be used for public staging until auth wiring is ready.

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

See also:
- `docs/M4.md` for database schema and Braille prototype notes.
- `docs/NETLIFY.md` for production Netlify settings.
- `docs/OCR_DOCKER.md` for packaging the OCR service.
- `docs/ACCESSIBILITY.md` for current accessibility posture and testing notes.
- `docs/A11Y_AUDIT.md` for WCAG audit notes and next steps.
- `docs/QA_PERFORMANCE.md` for QA/perf checklist.
- `docs/LEGAL.md` and `docs/ONBOARDING.md` for legal/onboarding guidance.
- `docs/RELEASE_PLAN.md` and `docs/BACKLOG.md` for release and feature-freeze planning.

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
  - `devops` - CI/CD, GKE/Cloud Run, Docker, release automation.
  - `docs` – README, guides, onboarding, legal docs.
  - Tagging a release like `v0.1.0` runs CI and publishes a tagged GitHub Release (see CI/CD overview below).

### CI/CD overview

- **CodeQL code scanning**: the `codeql.yml` workflow runs on pushes and pull requests targeting `main`, plus a weekly scheduled run. It analyzes the JavaScript/TypeScript (Next.js app) and Python (OCR service) code, installing dependencies first so the analyzers see the full project.
- **Release & package**: the `release-and-package.yml` workflow runs when you push a tag matching `v*.*.*`. It runs `npm test` and `npm run build:web`, creates a GitHub Release for that tag, and publishes the shared package `@raven-dev-ops/accessible-education-software-shared` to GitHub Packages.
- **Cloud Build / deploys**: container images for the web and backend (`cloudbuild-docker.yaml`) are built and pushed by Cloud Build. From there you can either roll out to GKE (`kubectl apply -f k8s/`) or update Cloud Run services that consume the same images.

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



