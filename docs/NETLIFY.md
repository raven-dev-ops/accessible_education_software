# Netlify production deploy checklist

Recommended Netlify settings for the Next.js app under `apps/web`:

## Build & deploy
- **Runtime:** Next.js (Netlify’s Next runtime)
- **Base directory:** `apps/web`
- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Functions directory:** `apps/web/netlify/functions`
- **Enforce production branch:** enable “Only changes to your production Git branch can deploy to production.”

## Environment variables
- `NEXTAUTH_URL` — e.g. `https://your-site.netlify.app`
- `NEXTAUTH_SECRET` — long random string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_AUTH_ENABLED` — `true` to require login; `false` for public placeholder
- `NEXT_PUBLIC_SHOW_STAGING_BANNER` — `true` on staging
- `ADMIN_EMAILS`, `TEACHER_EMAILS` — comma-separated allowlists
- `OCR_SERVICE_URL` — HTTP endpoint of OCR service (if wired)
- `DATABASE_URL` — Postgres connection string (if Netlify functions call DB via proxy/API)
- `ALLOW_SAMPLE_FALLBACKS` / `NEXT_PUBLIC_ALLOW_SAMPLE_FALLBACKS` — set to `false` in production to prevent sample data in APIs/UI. Preview/demos only.

## Notes
- The repo includes `netlify.toml` with the same settings; Netlify UI should mirror it.
- The Next.js runtime emits its own functions; custom Netlify functions live in `apps/web/netlify/functions`.
- Keep secrets out of logs; prefer a Cloud Run/API layer for DB access rather than direct DB from Netlify.
