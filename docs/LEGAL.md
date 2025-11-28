# Legal docs and data posture

- Privacy Policy: `docs/PRIVACY_POLICY.md`
- Terms of Service: `docs/TERMS_OF_SERVICE.md`
- Data: Do not upload real student PII during testing. Use staging/test accounts only.
- Hosting: Netlify frontend + optional Cloud Run/OCR backends. Keep secrets in environment variables; avoid embedding keys in client code.
- Logging: OCR service logs errors only; avoid writing user content to logs. Support tickets may include attachment URLs—treat as sensitive.
- Retention: No automated deletion policy yet—add if handling production data.
