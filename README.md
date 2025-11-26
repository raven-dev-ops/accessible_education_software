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
    - Listen to OCR output (planned)
  - **Teacher dashboard**
    - Upload materials (images/PDFs)
    - Attach detailed notes (up to **2000 words**)
    - Schedule auto-release or manual release of content
    - Review student uploads (planned)
  - **Admin dashboard**
    - View student information
    - Monitor system logs and analytics (planned)

- **Authentication with Auth0**
  - Auth0-backed login
  - Role-based routing (Student / Teacher / Admin)

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

## Roles

### Students

- Log in securely
- Upload handwritten notes for OCR
- Attach short context notes (≤ 500 words)
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
- Auth0 (authentication)
- Tailwind CSS or similar (utility-first styling, to be wired in)
- Light/Dark mode with pastel theming

**Backend**

- Python service (FastAPI/Flask-style) for OCR
- PyTesseract (Tesseract OCR)
- Optionally Node/Express for additional APIs or orchestration

**Database**

- PostgreSQL on Google Cloud (Cloud SQL)

**Infrastructure / Deployment**

- Frontend: Netlify (planned)
- Backend: Google Cloud (Cloud Run / App Engine) or Heroku (planned)
- Auth: Auth0 (Google Cloud integration)

---

## Architecture

At a high level:

- **Next.js frontend**
  - Handles login via Auth0
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

- **Auth0**
  - Handles authentication flows (login, logout, callback)
  - Stores identity & roles
  - Provides tokens used by frontend/backend

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

Frontend (`apps/web/.env.local`, copy from `.env.local.example`):

- `AUTH0_SECRET` – random long secret used by Auth0 SDK for session encryption.
- `AUTH0_BASE_URL` – e.g. `http://localhost:3000` in development.
- `AUTH0_ISSUER_BASE_URL` – your Auth0 tenant URL, e.g. `https://YOUR_DOMAIN.auth0.com`.
- `AUTH0_CLIENT_ID` – Auth0 application Client ID.
- `AUTH0_CLIENT_SECRET` – Auth0 application Client Secret.
- `NEXT_PUBLIC_AUTH0_ROLES_CLAIM` – optional claim name where Auth0 places roles (e.g. `https://your-domain.com/roles`); falls back to `roles` if omitted.
- `OCR_SERVICE_URL` – base URL for the Python OCR service (e.g. `http://localhost:8000`).
- `DATABASE_URL` – PostgreSQL connection string used by Prisma (optional for Day 2; the app will fall back to mock data if not configured).

### Run the apps

Additional frontend env flags (set in `apps/web/.env.local` for local development, and in Netlify environment variables for the deployed web app):

- `NEXT_PUBLIC_AUTH_ENABLED` - controls whether the frontend uses the real Auth0 login flow (`true`/`1`) or shows the "Login – Coming Soon" placeholder (`false`/unset).
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

### Auth0 setup (development)

High-level steps to get Auth0 working with the Next.js app:

1. **Create a tenant and application**
   - In the Auth0 dashboard, create a Regular Web Application (or reuse an existing one).
   - Note the **Domain**, **Client ID**, and **Client Secret**.
2. **Configure allowed URLs**
   - Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000/`
   - Allowed Web Origins: `http://localhost:3000`
3. **Configure roles**
   - Enable Role-Based Access Control (RBAC) in Auth0.
   - Create roles such as `admin`, `teacher`, and `student`.
   - Assign roles to your test users.
4. **Expose roles as a token claim**
   - In the Auth0 Dashboard under API / Permissions or via an Action/Rule, configure roles to be added to ID tokens.
   - Either:
     - Use the built-in `roles` claim and leave `NEXT_PUBLIC_AUTH0_ROLES_CLAIM` empty, or
     - Use a custom namespaced claim like `https://your-domain.com/roles` and set `NEXT_PUBLIC_AUTH0_ROLES_CLAIM` accordingly.
5. **Set `apps/web/.env.local` values**
   - Fill in the Auth0 values from step 1 and any custom roles claim from step 4.
   - Restart `npm run dev:web` so the environment changes take effect.

---

## Mock Data (Day 2)

For early development, the app uses mock data and stubbed APIs:

- `apps/web/data/sampleStudents.json` – sample student records for the admin dashboard.
- `apps/web/pages/api/students.ts` – returns the mock students.
- `apps/web/pages/api/upload.ts` – accepts file uploads and logs metadata (no real OCR yet).
- `apps/web/pages/api/test-ocr.ts` – stub endpoint to exercise the OCR pipeline and logs.

These will be replaced with real database and OCR-service-backed implementations as the project progresses.

---

## APIs & Database
  
  Several Next.js API routes power the dashboards:

- `GET /api/students` – returns a list of students for the admin dashboard. Uses the `User` table when the database is configured; otherwise falls back to `apps/web/data/sampleStudents.json`.
- `GET /api/modules` – returns a list of modules for the teacher dashboard. Uses the `Module` and `Course` tables when available; otherwise falls back to `apps/web/data/sampleModules.json`.
- `GET /api/notes` – returns “released materials” for the student dashboard. Uses the `Note`, `Module`, and `Course` tables when available; otherwise falls back to `apps/web/data/sampleNotes.json`.
- `POST /api/upload` – accepts a file upload and, if `OCR_SERVICE_URL` is configured, forwards the file to the Python OCR service `/ocr` endpoint. Returns basic file metadata and any OCR text received.
- `POST /api/test-ocr` – calls the OCR service `/health` endpoint (when `OCR_SERVICE_URL` is set) and reports whether OCR is available; otherwise returns a stub message.

### Database & Prisma

The Next.js app uses Prisma to talk to PostgreSQL (see `apps/web/prisma/schema.prisma`).

Configure the database connection in `apps/web/.env.local`:

  ```bash
  DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/accessible_education?schema=public
  ```

  Generate the Prisma client:
  
  ```bash
  npm run prisma:generate
  ```

Run the development seed script once your database and migrations are in place:

```bash
npm run seed:dev
```

  This creates:

- A `Course` for “Calculus I” with a few `Module` entries.
- A teacher user (`teacher@example.com`) and a few sample student users.
  - One sample `Note` attached to the first Calculus I module, which surfaces through `/api/notes` and the student "Released materials" section.
  
---

## Security & Code Scanning

Security is treated as a first-class concern even during the MVP phase:

- A dedicated security policy lives in `SECURITY.md`, including how to report vulnerabilities and the current MVP security posture.
- GitHub CodeQL is configured via `.github/workflows/codeql.yml` to automatically scan the JavaScript/TypeScript (Next.js) and Python (OCR service) code for common vulnerabilities and coding errors on pushes, pull requests, and a weekly schedule.
- Dependencies are monitored with `npm audit`; production dependencies are currently free of known vulnerabilities, and the `glob` advisory affecting a dev-only ESLint toolchain is mitigated by a top-level override in `package.json`.
- Secrets such as Auth0 credentials, database URLs, and OCR service endpoints are injected only via environment variables and are never committed to the repository.
- The `NEXT_PUBLIC_AUTH_ENABLED` flag controls whether the deployed Netlify frontend uses the real Auth0 login flow (`true`/`1`) or shows the "Login – Coming Soon" placeholder (`false`/unset), which should be used for public staging until Auth0 wiring is ready.

Before any real student data is processed in production, the plan is to harden API-level authorization, tighten file upload limits and validation, and perform a focused configuration/dependency review as described in `SECURITY.md`.

Additionally, in this repository:

- The CodeQL workflow performs an explicit JavaScript/TypeScript build (`npm install` + `npm run build:web` from the monorepo root) so that analysis runs against the compiled Next.js app.
- Key API routes such as `/api/students`, `/api/modules`, and `/api/notes` are also protected server-side using Auth0 session/roles (when `NEXT_PUBLIC_AUTH_ENABLED` is true), complementing the frontend page guards.

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

- **M1–M2** – Foundation, repo hygiene, Auth0 integration, basic dashboards, theming.
- **M3–M4** – Auth + OCR wiring, upload UX, student TTS, database foundation.
- **M5–M7** – Persistence, CI hardening, accessibility polish, OCR robustness, Beta.
- **M8–M10** – Testing, performance, packaging, deployment, and MVP client handover.

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
- Tagging a release like `v0.1.0` runs CI (tests + `npm run build:web`),
  creates a GitHub Release, and publishes the shared package
  `@raven-dev-ops/accessible-education-software-shared` to GitHub Packages.

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
