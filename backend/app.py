"""
app.py — FastAPI entry point for the Reimbursement OCR backend.
Includes the OCR router, a /health endpoint, and serves the testing frontend.

Run with:  python app.py   (or: uvicorn app:app --reload)
"""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from ocr import router as ocr_router
from gemini_manager import GeminiManager

app = FastAPI(
    title="Reimbursement OCR Backend",
    description="Upload receipt images for AI-powered expense extraction with quota management.",
    version="1.0.0",
)

# ── CORS (allow all origins for dev — tighten in production) ──────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register OCR routes ──────────────────────────────────────────────────
app.include_router(ocr_router)

# ── Serve static frontend ───────────────────────────────────────────────
STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def serve_frontend():
    """Serve the testing frontend at the root URL."""
    return FileResponse(str(STATIC_DIR / "index.html"))


# ── Health check ─────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    """Returns server status and Gemini quota stats."""
    try:
        manager = GeminiManager()
        quota = manager.quota_stats()
        gemini_ok = quota["requests_remaining"] > 0
    except Exception:
        quota = {}
        gemini_ok = False

    return {
        "status": "ok",
        "service": "Reimbursement OCR Backend",
        "gemini_api": "available" if gemini_ok else "quota_exhausted",
        "quota": quota,
    }


# ── Run directly with: python app.py ─────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
