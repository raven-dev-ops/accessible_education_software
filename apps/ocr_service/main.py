import io
import logging
from typing import List, Tuple

from fastapi import FastAPI, File, UploadFile
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
    title="Accessible Education OCR Service",
    description="OCR service with basic PDF/text image handling.",
    version="0.2.0",
)

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


class OCRRequest(BaseModel):
    filename: str | None = None
    content_type: str | None = None
    text: str | None = None  # Optional text body or hex-encoded PDF bytes
    ai_verify: bool | None = False


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


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "ocr_available": bool(pytesseract and Image),
        "pdf_available": bool(fitz),
    }


@app.post("/ocr-file")
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
            return JSONResponse(status_code=200, content={"ok": True, "type": "image", "text": text})
        except Exception:
            logger.exception("OCR failed while processing uploaded image")
            return JSONResponse(
                status_code=500,
                content={"ok": False, "message": "OCR failed while processing the uploaded image."},
            )

    return JSONResponse(status_code=400, content={"ok": False, "message": "Unsupported content_type"})


@app.post("/ocr-json")
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
