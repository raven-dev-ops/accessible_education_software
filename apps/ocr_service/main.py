import logging
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse

try:
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore
except Exception:
    pytesseract = None  # type: ignore
    Image = None  # type: ignore

logger = logging.getLogger("accessible_education_ocr")

app = FastAPI(
    title="Accessible Education OCR Service",
    description="Day 2 skeleton OCR service using PyTesseract.",
    version="0.1.0",
)

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "ocr_available": bool(pytesseract and Image)}


@app.post("/ocr")
async def run_ocr(file: UploadFile = File(...)) -> JSONResponse:
    """
    Minimal OCR endpoint for Day 2.
    For now, this reads a single image file and returns text if pytesseract is available.
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
            content={
                "ok": False,
                "message": "Uploaded file is too large. Maximum allowed size is 10MB.",
            },
        )

    try:
        from io import BytesIO

        image = Image.open(BytesIO(contents))
        text = pytesseract.image_to_string(image)
    except Exception:
        logger.exception("OCR failed while processing uploaded file")
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "message": "OCR failed while processing the uploaded file.",
            },
        )

    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "filename": file.filename,
            "text": text,
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
