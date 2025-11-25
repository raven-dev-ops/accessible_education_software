# OCR Service (Skeleton)

This directory contains the backend OCR service for the Accessible Education Platform.

Day 2 goals:

- Provide a minimal FastAPI-based HTTP service skeleton.
- Prove that PyTesseract can be imported and run on a sample file (if dependencies are installed).
- Keep the logic simple and ready for future expansion (PDF processing, AI verification, TTS, etc.).

You can run the service locally with:

```bash
uvicorn main:app --reload
```

Or run the sample OCR test (see root `package.json` script `test:ocr`):

```bash
npm run test:ocr
```

