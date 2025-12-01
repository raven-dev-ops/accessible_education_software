import io
import logging
from typing import Any, List, Tuple

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import requests

try:
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore
except Exception:
    pytesseract = None  # type: ignore
    Image = None  # type: ignore

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None  # type: ignore

logger = logging.getLogger("accessible_education_ocr")

app = FastAPI(
    title="Accessible Education Backend (OCR + Logic)",
    description="Python backend for OCR and custom logic endpoints.",
    version="0.2.0",
)

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


class OCRRequest(BaseModel):
    filename: str | None = None
    content_type: str | None = None
    text: str | None = None  # Optional text body or hex-encoded PDF bytes
    ai_verify: bool | None = False


class LogicRequest(BaseModel):
    """Generic payload for custom backend logic.

    This is intentionally simple: you can extend it in-place
    as your project grows (e.g., add specific fields for
    grading, normalization, or routing decisions).
    """

    payload: dict[str, Any] | None = None
    tags: list[str] | None = None


class MathCleanupRequest(BaseModel):
    text: str
    prompt_hint: str | None = None
    format: str | None = "latex"


class MathCleanupResponse(BaseModel):
    ok: bool
    cleaned_text: str
    latex: str | None = None
    mathml: str | None = None
    explanation: str | None = None


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Optional API key guard for heavy endpoints.

    If OCR_SERVICE_API_KEY or BACKEND_API_KEY is set in the environment,
    require that callers present a matching x-api-key header. If no key
    is configured, the check is a no-op and all callers are allowed.
    """
    expected = os.environ.get("OCR_SERVICE_API_KEY") or os.environ.get("BACKEND_API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )


def run_ocr_on_image(image: "Image.Image") -> str:
    return pytesseract.image_to_string(image) if pytesseract else ""


def maybe_ai_verify(text: str) -> dict | None:
    """Optional AI verification hook; enabled via env AI_VERIFY_URL and toggle."""
    if not text.strip():
        return None
    ai_url = os.environ.get("AI_VERIFY_URL")
    ai_key = os.environ.get("AI_VERIFY_API_KEY")
    if not ai_url:
        return None
    try:
        resp = requests.post(
            ai_url,
            headers={"Authorization": f"Bearer {ai_key}"} if ai_key else {},
            json={"text": text, "context": "calculus_ocr"},
            timeout=10,
        )
        if resp.ok:
            return resp.json()
    except Exception:
        logger.exception("AI verification failed")
    return None


def maybe_math_cleanup(text: str) -> MathCleanupResponse | None:
    """Optional math cleanup via DeepSeekMath service.

    When MATH_INFERENCE_URL is set, forward OCR text to the math-inference
    service running in the cluster (or elsewhere) and return its structured
    response. If the service is unavailable or returns an error, fall back
    to the original OCR text.
    """
    base_url = os.environ.get("MATH_INFERENCE_URL")
    if not base_url or not text.strip():
        return None

    url = base_url.rstrip("/") + "/v1/math-verify"
    try:
        resp = requests.post(
            url,
            json={"ocr_text": text, "prompt_hint": "calculus_ocr", "format": "latex"},
            timeout=20,
        )
        if not resp.ok:
            logger.warning("math-inference responded with %s: %s", resp.status_code, resp.text)
            return None
        data = resp.json()
        return MathCleanupResponse(**data)
    except Exception:
        logger.exception("math-inference call failed")
        return None

def is_scanned_pdf(doc: "fitz.Document") -> bool:
    if doc is None or doc.page_count == 0:
        return False
    page = doc.load_page(0)
    text = page.get_text("text")
    return len(text.strip()) == 0


def pdf_page_images(doc: "fitz.Document", dpi: int = 200) -> List[Tuple[int, "Image.Image"]]:
    images: List[Tuple[int, "Image.Image"]] = []
    if doc is None or Image is None:
        return images
    for i in range(doc.page_count):
        page = doc.load_page(i)
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        images.append((i, img))
    return images


@app.post("/logic/echo", dependencies=[Depends(require_api_key)])
async def logic_echo(req: LogicRequest) -> JSONResponse:
    """Stub endpoint for project-specific backend logic.

    Today this simply echoes the payload and tags you send.
    Over time you can replace this with your own business
    rules (scoring, normalization, routing) while keeping
    the frontend contract stable.
    """
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "message": "Logic service stub response.",
            "payload": req.payload or {},
            "tags": req.tags or [],
        },
    )


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "ocr_available": bool(pytesseract and Image),
        "pdf_available": bool(fitz),
    }


@app.get("/logic/health")
async def logic_health() -> dict:
    """Simple health check for the custom logic surface."""
    return {
        "status": "ok",
        "component": "logic",
        "version": app.version,
    }


@app.post("/ocr-file", dependencies=[Depends(require_api_key)])
async def run_ocr(file: UploadFile = File(...)) -> JSONResponse:
    """
    OCR endpoint that accepts uploaded files (images or PDFs).
    - If PDF: detect text vs scanned; extract text or render pages to images and OCR them.
    - If image: OCR directly.
    """
    if pytesseract is None or Image is None:
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "message": "pytesseract/Pillow not available. Install dependencies and Tesseract binary.",
            },
        )

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE_BYTES:
        return JSONResponse(
          status_code=413,
          content={"ok": False, "message": "Uploaded file is too large. Maximum allowed size is 10MB."},
        )

    # PDF path
    if file.content_type == "application/pdf":
        if fitz is None:
            return JSONResponse(
                status_code=500,
                content={"ok": False, "message": "PDF support requires PyMuPDF (fitz)."},
            )
        try:
            with fitz.open(stream=contents, filetype="pdf") as doc:
                scanned = is_scanned_pdf(doc)
                if scanned:
                    pages = pdf_page_images(doc)
                    text_parts = []
                    for idx, img in pages:
                        text_parts.append(f"[page {idx+1}] {run_ocr_on_image(img)}")
                    return JSONResponse(
                        status_code=200,
                        content={"ok": True, "type": "pdf_scanned", "pages": len(pages), "text": "\n".join(text_parts)},
                    )
                else:
                    text_parts = []
                    for i in range(doc.page_count):
                        text_parts.append(f"[page {i+1}] {doc.load_page(i).get_text('text')}")
                    return JSONResponse(
                        status_code=200,
                        content={"ok": True, "type": "pdf_text", "pages": doc.page_count, "text": "\n".join(text_parts)},
                    )
        except Exception:
            logger.exception("PDF processing failed")
            return JSONResponse(
                status_code=500,
                content={"ok": False, "message": "PDF processing failed"},
            )

    # Image path
    if file.content_type and file.content_type.startswith("image/"):
        try:
            image = Image.open(io.BytesIO(contents))
            text = run_ocr_on_image(image)
            math = maybe_math_cleanup(text)
            content: dict[str, Any] = {"ok": True, "type": "image", "text": text}
            if math:
                content["math"] = math.dict()
            return JSONResponse(status_code=200, content=content)
        except Exception:
            logger.exception("OCR failed while processing uploaded image")
            return JSONResponse(
                status_code=500,
                content={"ok": False, "message": "OCR failed while processing the uploaded image."},
            )

    return JSONResponse(status_code=400, content={"ok": False, "message": "Unsupported content_type"})


@app.post("/ocr-json", dependencies=[Depends(require_api_key)])
async def run_ocr_json(req: OCRRequest) -> JSONResponse:
    """
    OCR endpoint for JSON payloads.
    - If content_type=application/pdf and text is hex-encoded bytes, process PDF.
    - If content_type starts with image/* and text is base64? (not implemented) -> returns unsupported.
    - If plain text provided, echo back as OCR result.
    """
    if req.text and not req.content_type:
        ai = maybe_ai_verify(req.text) if req.ai_verify else None
        return JSONResponse(status_code=200, content={"ok": True, "type": "text", "text": req.text, "pages": 1, "ai": ai})

    if req.content_type == "application/pdf":
        if fitz is None:
            return JSONResponse(status_code=500, content={"ok": False, "message": "PDF support requires PyMuPDF (fitz)."})
        try:
            pdf_bytes = bytes.fromhex(req.text or "")
            with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
                scanned = is_scanned_pdf(doc)
                if scanned:
                    pages = pdf_page_images(doc)
                    text_parts = []
                    for idx, img in pages:
                        text_parts.append(f"[page {idx+1}] {run_ocr_on_image(img)}")
                    text_out = "\n".join(text_parts)
                    ai = maybe_ai_verify(text_out) if req.ai_verify else None
                    return JSONResponse(
                        status_code=200,
                        content={"ok": True, "type": "pdf_scanned", "pages": len(pages), "text": text_out, "ai": ai},
                    )
                else:
                    text_parts = []
                    for i in range(doc.page_count):
                        text_parts.append(f"[page {i+1}] {doc.load_page(i).get_text('text')}")
                    text_out = "\n".join(text_parts)
                    ai = maybe_ai_verify(text_out) if req.ai_verify else None
                    return JSONResponse(
                        status_code=200,
                        content={"ok": True, "type": "pdf_text", "pages": doc.page_count, "text": text_out, "ai": ai},
                    )
        except Exception:
            logger.exception("PDF processing failed")
            return JSONResponse(
                status_code=500,
                content={"ok": False, "message": "PDF processing failed"},
            )

    return JSONResponse(status_code=400, content={"ok": False, "message": "Unsupported content_type"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
