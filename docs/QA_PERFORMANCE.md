# QA & performance checklist (Alpha/Beta)

## Web (Next.js)
- Lint/build: `npm run lint:web` and `npm run build --workspace @raven-dev-ops/accessible-education-web`.
- Basic runtime check: `npm --workspace apps/web run dev` and visit `/login`, `/student?preview=1`, `/teacher?preview=1`, `/admin` (authorized).
- Accessibility sanity: keyboard-only nav, skip link, focus outlines, VoiceOver/NVDA quick scan.
- Images: `next/image` used where applicable; avoid oversized assets.
- Reduce motion: verify `prefers-reduced-motion` removes transitions.

## OCR service
- Syntax check: `python -m compileall apps/ocr_service`.
- Local run: `uvicorn apps/ocr_service/main:app --reload`.
- PDF paths: test text PDF vs scanned PDF (requires PyMuPDF + Tesseract) and confirm graceful error if dependencies missing.
- AI verify hook: set `AI_VERIFY_URL`/`AI_VERIFY_API_KEY` to exercise optional verification; ensure failures don’t break OCR response.

## Performance notes
- Keep web builds lean: base `apps/web`, publish `.next`, enable build cache if available.
- API calls: student/teacher/admin pages fallback to samples if API/DB unavailable; monitor `/api/notes`, `/api/students`, `/api/uploads`.
- Consider adding Lighthouse/AXE in CI for perf/a11y budgets.

## CI
- `.github/workflows/ci.yml` runs lint/build for web and syntax-checks OCR on PRs/pushes.
- Release workflow builds web and publishes shared package to GH Packages (auth configured).
