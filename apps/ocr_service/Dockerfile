FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends tesseract-ocr libtesseract-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/ocr_service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/ocr_service ./apps/ocr_service

WORKDIR /app/apps/ocr_service

ENV PORT=8000
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

*** Add File: cloudbuild-docker.yaml
steps:
  - name: gcr.io/cloud-builders/docker
    id: build-web
    args:
      [
        "build",
        "-t",
        "$_WEB_IMAGE",
        "-f",
        "apps/web/Dockerfile",
        ".",
      ]
  - name: gcr.io/cloud-builders/docker
    id: build-backend
    args:
      [
        "build",
        "-t",
        "$_BACKEND_IMAGE",
        "-f",
        "apps/ocr_service/Dockerfile",
        ".",
      ]
images:
  - "$_WEB_IMAGE"
  - "$_BACKEND_IMAGE"
substitutions:
  _WEB_IMAGE: "us-central1-docker.pkg.dev/cs-poc-kvjwpp97kjozemn894cmvvg/cloud-run-source-deploy/accessible-web:latest"
  _BACKEND_IMAGE: "us-central1-docker.pkg.dev/cs-poc-kvjwpp97kjozemn894cmvvg/cloud-run-source-deploy/accessible-backend:latest"

