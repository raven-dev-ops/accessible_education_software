# OCR service Docker packaging (baseline)

This packages `apps/ocr_service` into a simple container for deployment
on Kubernetes (GKE) or Cloud Run. The service exposes both OCR
endpoints and generic Python logic endpoints, so it can serve as the
main backend for the project.

## Example Dockerfile
```Dockerfile
FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends tesseract-ocr libtesseract-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY apps/ocr_service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/ocr_service ./

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Build and run
```bash
docker build -t ocr-service:local -f Dockerfile .
docker run -p 8000:8000 ocr-service:local
```

## Cloud Run tips
- Use `--max-instances` and `--memory` sized for Tesseract; start with 512–1024Mi.
- If calling Cloud SQL, add the Cloud SQL connector or proxy as a sidecar; otherwise keep it stateless.
- Attach minimal scopes; prefer Workload Identity Federation over static keys.

## Testing
- Local sanity: `npm run test:ocr` (runs sample_ocr_test.py) or `curl http://localhost:8000` once container is up.
- Log OCR errors to stderr; add health endpoints if needed (`/healthz`).
