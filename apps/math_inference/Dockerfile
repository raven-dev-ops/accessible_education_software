FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/math_inference/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY apps/math_inference ./apps/math_inference
WORKDIR /app/apps/math_inference

EXPOSE 8000

ENV MATH_MODEL_ID="deepseek-ai/deepseek-math-7b-instruct" \
    MATH_MODEL_DEVICE="cuda"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

