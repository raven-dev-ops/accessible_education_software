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

