import logging
import os
from functools import lru_cache
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("accessible_math_inference")

app = FastAPI(
    title="Accessible Education Math Inference",
    description="DeepSeekMath-backed reasoning service for math OCR cleanup.",
    version="0.1.0",
)


class MathVerifyRequest(BaseModel):
    ocr_text: str
    prompt_hint: Optional[str] = None
    format: Optional[str] = "latex"  # or "mathml" or "plain"


class MathVerifyResponse(BaseModel):
    ok: bool
    cleaned_text: str
    latex: Optional[str] = None
    mathml: Optional[str] = None
    explanation: Optional[str] = None
    raw_model_output: Optional[Dict[str, Any]] = None


@lru_cache(maxsize=1)
def load_model():
    """
    Lazy-load the DeepSeekMath model and tokenizer on first request.

    This should be called only after the GPU pod has started and the
    model node is available. It uses an env var for the model ID so
    you can swap variants without changing code.
    """
    model_id = os.environ.get(
        "MATH_MODEL_ID",
        "deepseek-ai/deepseek-math-7b-instruct",
    )
    device = os.environ.get("MATH_MODEL_DEVICE", "cuda")

    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer

        tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            device_map=device,
            torch_dtype="auto",
        )
        logger.info("Loaded math model %s on device %s", model_id, device)
        return tokenizer, model
    except Exception:
        logger.exception("Failed to load math model")
        raise


def build_prompt(ocr_text: str, hint: Optional[str], fmt: str) -> str:
    fmt = fmt.lower()
    target = "LaTeX"
    if fmt == "mathml":
        target = "MathML"
    instructions = (
        "You are a math reasoning assistant. "
        "You receive noisy OCR output for mathematical expressions and should:\n"
        "1) Correct obvious OCR errors.\n"
        "2) Output a clean version of the math.\n"
        f"3) Provide the expression in {target} and a short plain-language explanation.\n\n"
    )
    if hint:
        instructions += f"Context: {hint}\n\n"
    instructions += f"OCR text:\n{ocr_text}\n\nRespond in JSON with keys: cleaned_text, latex, mathml, explanation."
    return instructions


def run_inference(request: MathVerifyRequest) -> MathVerifyResponse:
    tokenizer, model = load_model()
    prompt = build_prompt(request.ocr_text, request.prompt_hint, request.format or "latex")

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    max_new_tokens = int(os.environ.get("MATH_MODEL_MAX_NEW_TOKENS", "512"))

    output_ids = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=False,
    )
    full_text = tokenizer.decode(output_ids[0], skip_special_tokens=True)

    # Heuristic: model may echo the prompt; try to take the tail.
    response_text = full_text[len(prompt) :].strip() or full_text.strip()

    # Best-effort JSON extraction; if it fails, still return the raw string.
    cleaned_text = request.ocr_text
    latex: Optional[str] = None
    mathml: Optional[str] = None
    explanation: Optional[str] = None
    raw_model_output: Dict[str, Any] = {"text": response_text}

    try:
        import json

        start = response_text.find("{")
        end = response_text.rfind("}")
        if start != -1 and end != -1 and end > start:
            obj = json.loads(response_text[start : end + 1])
            cleaned_text = obj.get("cleaned_text", cleaned_text)
            latex = obj.get("latex")
            mathml = obj.get("mathml")
            explanation = obj.get("explanation")
            raw_model_output["json"] = obj
    except Exception:
        logger.exception("Failed to parse model JSON response")

    return MathVerifyResponse(
        ok=True,
        cleaned_text=cleaned_text,
        latex=latex,
        mathml=mathml,
        explanation=explanation,
        raw_model_output=raw_model_output,
    )


@app.get("/health")
async def health() -> Dict[str, Any]:
    """Lightweight health check that does not load the model."""
    return {
        "status": "ok",
        "component": "math-inference",
        "model_loaded": load_model.cache_info().currsize > 0,
    }


@app.post("/v1/math-verify", response_model=MathVerifyResponse)
async def math_verify(req: MathVerifyRequest) -> MathVerifyResponse:
    if not req.ocr_text.strip():
        raise HTTPException(status_code=400, detail="ocr_text must not be empty")
    try:
        return run_inference(req)
    except Exception as exc:
        logger.exception("Math inference failed")
        raise HTTPException(status_code=500, detail=f"Math inference failed: {exc}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

