# Onboarding (developers/ops)

1) Clone and install
   - `npm install` at repo root (monorepo workspaces).
   - Node 18+; Python 3.11 for OCR service.
2) Web app
   - Dev: `npm --workspace apps/web run dev`
   - Build: `npm --workspace apps/web run build`
   - Env: set `NEXTAUTH_URL/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ADMIN_EMAILS`, `TEACHER_EMAILS`, `NEXT_PUBLIC_AUTH_ENABLED`, `OCR_SERVICE_URL`, `DATABASE_URL`.
3) OCR service
   - Run: `uvicorn apps/ocr_service/main:app --reload`
   - Optional PDF support: install PyMuPDF; Tesseract required for OCR.
4) CI/Release
   - CI: `.github/workflows/ci.yml` (lint/build web, OCR syntax check).
   - Release: tags trigger `release-and-package.yml` (GH Packages publish, release notes).
5) Access & roles
   - Admin/teacher/student roles determined by email allowlists in env vars.
6) Security
   - Keep secrets in env vars or secrets manager; avoid committing `.env`.
   - Prefer Workload Identity/Cloud Run or GKE for backend access instead of direct DB connections from the client.
