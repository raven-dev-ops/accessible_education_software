import io
from typing import List, Tuple

from PIL import Image

try:
  import fitz  # PyMuPDF
except ImportError:
  fitz = None


def is_scanned_pdf(doc: "fitz.Document") -> bool:
  """Heuristic: if the first page has no text blocks, treat as scanned."""
  if doc is None or doc.page_count == 0:
    return False
  page = doc.load_page(0)
  text = page.get_text("text")
  return len(text.strip()) == 0


def pdf_page_images(doc: "fitz.Document", dpi: int = 200) -> List[Tuple[int, Image.Image]]:
  """
  Render each page to a PIL Image at the requested DPI.
  Returns list of (page_index, image).
  """
  images: List[Tuple[int, Image.Image]] = []
  if doc is None:
    return images
  for i in range(doc.page_count):
    page = doc.load_page(i)
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    images.append((i, img))
  return images
