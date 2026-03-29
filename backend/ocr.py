"""
ocr.py — FastAPI router for receipt OCR extraction.
All Gemini calls go through GeminiManager for quota safety.

Endpoints:
    POST /api/ocr-receipt   — Upload a receipt image, get structured expense data
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from gemini_manager import handle_receipt_upload

router = APIRouter()


@router.post("/api/ocr-receipt")
async def ocr_receipt(receipt: UploadFile = File(...)):
    """
    Upload a receipt image and get AI-extracted expense fields.
    Returns extracted data + Gemini quota stats.
    On quota exhaustion, returns fallback data with a warning.
    """

    # ── Validate file type ────────────────────────────────────────────────
    allowed = {"png", "jpg", "jpeg", "gif", "webp"}
    ext = (receipt.filename or "").rsplit(".", 1)[-1].lower()

    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"File type .{ext} not supported. Use JPG or PNG.",
        )

    # ── Read file bytes and pass to GeminiManager ─────────────────────────
    file_bytes = await receipt.read()
    result = handle_receipt_upload(file_bytes)

    return result