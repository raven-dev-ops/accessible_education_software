"""
Sample OCR test script for Day 2.

This script is wired to `npm run test:ocr` at the repository root.
It attempts to import PyTesseract and, if a sample image is present, runs OCR on it.
"""

from pathlib import Path


def main() -> None:
    try:
        import pytesseract  # type: ignore
        from PIL import Image  # type: ignore
    except Exception as exc:  # pragma: no cover - simple environment check
        print("PyTesseract or Pillow not available:", exc)
        print("Install them with `pip install -r apps/ocr_service/requirements.txt`.")
        return

    sample_path = Path(__file__).parent / "sample_data" / "sample_notes.png"
    if not sample_path.exists():
        print("No sample image found at:", sample_path)
        print("Place a test image there to exercise OCR.")
        return

    image = Image.open(sample_path)
    text = pytesseract.image_to_string(image)

    print("OCR completed successfully. First 200 characters:")
    print(text[:200])


if __name__ == "__main__":
    main()

