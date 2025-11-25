# accessible_education_systems

> AI‑powered, accessible STEM note system that turns handwritten calculus notes into readable, listenable content for blind and low‑vision students.

`accessible_education_systems` is an AI‑assisted accessibility platform focused on college‑level STEM courses, starting with **Calculus I** (repo here: https://github.com/raven-dev-ops/ocr_calculus_1)

The system helps **students**, **teachers**, and **site admins** work with handwritten notes and course materials by:

- Converting images/PDFs of handwritten notes into machine‑readable text
- Using AI to verify and improve OCR output (especially math notation)
- Providing a path to audio/text‑to‑speech for blind and low‑vision students
- Supporting role‑based workflows and scheduling of course content

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
- [Accessibility](#accessibility)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Legal & Privacy](#legal--privacy)

---

## Features

### Current & Planned (MVP)

- 🧮 **Calculus I OCR module**
  - Upload handwritten calculus notes (images/PDFs)
  - Convert to text (via OCR), with future support for LaTeX/MathML
  - Read output via text‑to‑speech (planned)

- 🧠 **AI‑assisted OCR verification (planned)**
  - Compare OCR output to the original image
  - Suggest corrections, especially for math notation and symbols
  - Allow professor‑specific tuning based on handwriting samples

- 👩‍🏫 **Role‑based dashboards**
  - **Student dashboard**
    - Upload handwritten notes
    - Attach short notes (up to **500 words**)
    - Access teacher‑released course materials
    - Listen to OCR output (planned)
  - **Teacher dashboard**
    - Upload materials (images/PDFs)
    - Attach detailed notes (up to **2000 words**)
    - Schedule auto‑release or manual release of content
    - Review student uploads (planned)
  - **Admin dashboard**
    - View student information
    - Monitor system logs and analytics (planned)

- 🔐 **Authentication with Auth0**
  - Auth0‑backed login
  - Role‑based routing (Student / Teacher / Admin)

- 🗂 **Monorepo architecture**
  - **Next.js** frontend: lightweight, accessible UI (deployed to Netlify)
  - **Backend OCR service**: Python + Tesseract (planned deployment on Google Cloud / Heroku)
  - **PostgreSQL** database: hosted on Google Cloud
  - Shared utilities and types for consistency

- 🎨 **Accessibility‑first UI**
  - Light and dark mode with **pastel** color palette
  - Screen‑reader friendly layout
  - Keyboard‑navigable flows
  - Designed with blind and low‑vision users in mind

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
- Choose auto‑release schedules or manual release
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
- Tailwind CSS or similar (utility‑first styling)
- Light/Dark mode with pastel theming

**Backend**

- Python service (FastAPI/Flask or similar) for OCR
- PyTesseract (Tesseract OCR)
- Optionally Node/Express for additional APIs or orchestration

**Database**

- PostgreSQL on Google Cloud (Cloud SQL)

**Infrastructure / Deployment**

- Frontend: Netlify
- Backend: Google Cloud (Cloud Run / App Engine) or Heroku
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

*(You can adjust this to match your actual structure as you implement.)*

```text
accessible_education_systems/
  apps/
    frontend/           # Next.js app (Student/Teacher/Admin UI)
      pages/
      components/
      styles/
      public/
      ...
    backend/            # OCR + API service (Python/Node)
      app/              # FastAPI/Flask or Express routes
      ocr/              # OCR-related code (PyTesseract, pre/post-processing)
      ...
  packages/
    shared/             # Shared types, utilities, constants
  docs/
    PRIVACY_POLICY.md
    TERMS_OF_SERVICE.md
    LICENSE_NOTES.md    # additional legal notes if needed
  .gitignore
  README.md
  LICENSE               # All rights reserved
