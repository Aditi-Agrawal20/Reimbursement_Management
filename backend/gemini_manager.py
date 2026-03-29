"""
gemini_manager.py
=================
Drop-in Gemini API quota manager for the Reimbursement Management System.

Features:
  - Token usage tracking via response.usage_metadata
  - RPM throttling (max 15 req/min, auto-waits)
  - Blocks new calls at 95% of daily limits and logs a clear warning
  - Returns mock/fallback receipt data instead of crashing on quota errors
  - Persists daily usage to gemini_usage.json (survives server restarts)
  - Works with Flask (request.files) and Django (request.FILES) file objects
  - Includes a CLI dashboard: python gemini_manager.py

Usage in Flask/Django view:
    from gemini_manager import handle_receipt_upload
    result = handle_receipt_upload(request.files["receipt"])

CLI:
    python gemini_manager.py
"""

import io
import json
import logging
import os
import sys
import time
from collections import deque
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv  # pip install python-dotenv
from PIL import Image  # pip install Pillow
from google import genai  # pip install google-genai
from google.genai import types
from google.genai.errors import ClientError

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] GeminiManager — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Path to the persistent usage JSON file (same directory as this script)
# ---------------------------------------------------------------------------
USAGE_FILE = Path(__file__).parent / "gemini_usage.json"

# ---------------------------------------------------------------------------
# Free-tier limits (adjust if you upgrade)
# ---------------------------------------------------------------------------
FREE_TIER_RPM = 15          # requests per minute
FREE_TIER_RPD = 1_500       # requests per day
FREE_TIER_TPD = 1_000_000   # input tokens per day
BLOCK_THRESHOLD = 0.95      # block at 95% to leave headroom


# ===========================================================================
# GeminiManager class
# ===========================================================================
class GeminiManager:
    """
    Wraps the Gemini API client with quota tracking, throttling, and graceful
    degradation.

    Example:
        manager = GeminiManager()
        result = manager.extract_receipt(image_bytes)
    """

    def __init__(self, api_key: str | None = None):
        # Load .env if present
        load_dotenv()

        resolved_key = api_key or os.getenv("GEMINI_API_KEY")
        if not resolved_key:
            raise ValueError(
                "No Gemini API key found. Set GEMINI_API_KEY in your .env file "
                "or pass api_key= to GeminiManager()."
            )

        self._client = genai.Client(api_key=resolved_key)

        # ── RPM throttle (sliding window of request timestamps) ─────────────
        self._recent_requests: deque[float] = deque()

        # ── Load or initialise daily usage state ────────────────────────────
        self._usage = self._load_usage()

    # -----------------------------------------------------------------------
    # Persistence helpers
    # -----------------------------------------------------------------------
    def _load_usage(self) -> dict:
        """Load today's usage from disk; reset if it's a new day."""
        today = str(date.today())

        if USAGE_FILE.exists():
            try:
                with USAGE_FILE.open("r", encoding="utf-8") as f:
                    stored = json.load(f)
                if stored.get("date") == today:
                    logger.info(
                        "Loaded existing usage: %d requests, %d tokens today.",
                        stored["requests_today"],
                        stored["tokens_today"],
                    )
                    return stored
            except (json.JSONDecodeError, KeyError):
                pass  # corrupt file — start fresh

        # Fresh day or missing/corrupt file
        fresh = {
            "date": today,
            "requests_today": 0,
            "tokens_today": 0,
            "last_updated": datetime.now().isoformat(),
        }
        self._save_usage(fresh)
        return fresh

    def _save_usage(self, data: dict | None = None) -> None:
        """Persist usage counters to disk."""
        payload = data or self._usage
        payload["last_updated"] = datetime.now().isoformat()
        try:
            with USAGE_FILE.open("w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        except OSError as exc:
            logger.warning("Could not save usage file: %s", exc)

    # -----------------------------------------------------------------------
    # Quota helpers
    # -----------------------------------------------------------------------
    def _check_daily_limits(self) -> tuple[bool, str]:
        """
        Returns (ok: bool, reason: str).
        ok=False means the caller should use fallback data.
        """
        req_pct = self._usage["requests_today"] / FREE_TIER_RPD
        tok_pct = self._usage["tokens_today"] / FREE_TIER_TPD

        if req_pct >= BLOCK_THRESHOLD:
            msg = (
                f"⚠️  QUOTA WARNING: {self._usage['requests_today']}/{FREE_TIER_RPD} "
                f"daily requests used ({req_pct*100:.1f}%). Blocking call to protect quota."
            )
            logger.warning(msg)
            return False, msg

        if tok_pct >= BLOCK_THRESHOLD:
            msg = (
                f"⚠️  QUOTA WARNING: {self._usage['tokens_today']:,}/{FREE_TIER_TPD:,} "
                f"daily tokens used ({tok_pct*100:.1f}%). Blocking call to protect quota."
            )
            logger.warning(msg)
            return False, msg

        return True, ""

    def _throttle_rpm(self) -> None:
        """
        Enforce max 15 requests per 60-second sliding window.
        Auto-waits if the limit is reached.
        """
        now = time.monotonic()

        # Remove timestamps older than 60 seconds
        while self._recent_requests and now - self._recent_requests[0] > 60:
            self._recent_requests.popleft()

        if len(self._recent_requests) >= FREE_TIER_RPM:
            # Oldest request in window — wait until it rolls out
            wait_sec = 60 - (now - self._recent_requests[0]) + 0.1
            logger.info(
                "RPM limit reached (%d/min). Auto-waiting %.1fs …",
                FREE_TIER_RPM,
                wait_sec,
            )
            time.sleep(max(wait_sec, 0))
            # Refresh timestamp after sleep
            now = time.monotonic()
            while self._recent_requests and now - self._recent_requests[0] > 60:
                self._recent_requests.popleft()

        self._recent_requests.append(time.monotonic())

    def _record_usage(self, metadata) -> None:
        """Update counters from response.usage_metadata and persist."""
        try:
            total_tokens = getattr(metadata, "total_token_count", 0) or 0
            prompt_tokens = getattr(metadata, "prompt_token_count", 0) or 0
            output_tokens = getattr(metadata, "candidates_token_count", 0) or 0

            self._usage["requests_today"] += 1
            self._usage["tokens_today"] += total_tokens
            self._save_usage()

            logger.info(
                "API call #%d — prompt: %d tok, output: %d tok, total: %d tok | "
                "Day: %d/%d req, %d/%d tok",
                self._usage["requests_today"],
                prompt_tokens,
                output_tokens,
                total_tokens,
                self._usage["requests_today"],
                FREE_TIER_RPD,
                self._usage["tokens_today"],
                FREE_TIER_TPD,
            )
        except Exception as exc:
            logger.warning("Could not record usage metadata: %s", exc)

    # -----------------------------------------------------------------------
    # Public quota stats (for returning to callers)
    # -----------------------------------------------------------------------
    def quota_stats(self) -> dict:
        return {
            "date": self._usage["date"],
            "requests_today": self._usage["requests_today"],
            "requests_limit": FREE_TIER_RPD,
            "requests_remaining": max(0, FREE_TIER_RPD - self._usage["requests_today"]),
            "tokens_today": self._usage["tokens_today"],
            "tokens_limit": FREE_TIER_TPD,
            "tokens_remaining": max(0, FREE_TIER_TPD - self._usage["tokens_today"]),
        }

    # -----------------------------------------------------------------------
    # Fallback receipt data (returned when quota is exhausted)
    # -----------------------------------------------------------------------
    @staticmethod
    def _fallback_receipt(reason: str = "quota_exhausted") -> dict:
        """
        Returns a safe mock receipt when Gemini cannot be called.
        The caller should check result["_fallback"] == True to know this is mock data.
        """
        return {
            "amount": "",
            "currency": "INR",
            "date": str(date.today()),
            "description": "Please fill in manually — OCR unavailable",
            "category": "Miscellaneous",
            "vendor": "",
            "_fallback": True,
            "_fallback_reason": reason,
        }

    # -----------------------------------------------------------------------
    # Core extraction method
    # -----------------------------------------------------------------------
    def extract_receipt(self, image_bytes: bytes) -> dict:
        """
        Send a receipt image to Gemini and return structured expense data.

        Returns the extracted dict on success, or a fallback dict on quota/API errors.
        """
        # 1. Check daily limits first (prevents burning quota needlessly)
        ok, reason = self._check_daily_limits()
        if not ok:
            return self._fallback_receipt(reason)

        # 2. RPM throttle — auto-waits if needed
        self._throttle_rpm()

        prompt = """You are an expense receipt scanner.
Look at this receipt image carefully and extract the expense information.

Return ONLY a valid JSON object with these exact fields:
{
    "amount": <number — the final total amount, no currency symbol>,
    "currency": <3-letter currency code like USD, INR, GBP, EUR>,
    "date": <date in YYYY-MM-DD format>,
    "description": <short description of what was purchased, max 60 chars>,
    "category": <one of: Food, Travel, Accommodation, Miscellaneous>,
    "vendor": <name of the shop, restaurant, or service>
}

Rules:
- amount must be a number only (e.g. 850.00 not Rs. 850)
- If currency is unclear, default to INR
- If date is unclear, use today's date
- category must be exactly one of the four options
- Return ONLY the JSON, no extra text, no markdown, no explanation
"""

        try:
            response = self._client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    prompt,
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                ],
            )

            # 3. Record actual token usage
            self._record_usage(response.usage_metadata)

            # 4. Parse the JSON response
            raw = response.text.strip()

            # Strip markdown code fences if Gemini added them
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            return json.loads(raw)

        except ClientError as exc:
            # Handle 429 quota errors gracefully
            if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                logger.error(
                    "Quota exhausted (429). Returning fallback receipt data. "
                    "Wait for quota to reset or check https://ai.dev/rate-limit"
                )
                # Still count this against our daily counter (1 request was attempted)
                self._usage["requests_today"] += 1
                self._save_usage()
                return self._fallback_receipt("429_resource_exhausted")

            logger.error("Gemini API error: %s", exc)
            return self._fallback_receipt(f"api_error: {exc}")

        except json.JSONDecodeError:
            logger.warning("Gemini returned non-JSON response. Returning fallback.")
            return self._fallback_receipt("invalid_json_response")

        except Exception as exc:
            logger.error("Unexpected error calling Gemini: %s", exc)
            return self._fallback_receipt(f"unexpected_error: {exc}")


# ===========================================================================
# Image compression helper
# ===========================================================================
def compress_image(file_obj) -> bytes:
    """
    Compress an uploaded image to max 1024×1024 JPEG @ 85% quality.
    Accepts a file-like object (Flask/Django uploaded file or bytes).
    Returns compressed JPEG bytes.
    """
    if isinstance(file_obj, bytes):
        file_obj = io.BytesIO(file_obj)

    img = Image.open(file_obj)

    # Convert transparency modes to RGB (JPEG doesn't support alpha)
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    # Resize if too large (saves tokens — fewer pixels = less input)
    img.thumbnail((1024, 1024), Image.LANCZOS)

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    return buffer.getvalue()


# ===========================================================================
# Django / Flask view helper
# ===========================================================================
# Module-level singleton so the manager (and its RPM window) persists across
# requests within the same process.
_manager: GeminiManager | None = None


def _get_manager() -> GeminiManager:
    global _manager
    if _manager is None:
        _manager = GeminiManager()
    return _manager


def handle_receipt_upload(file_obj) -> dict:
    """
    High-level helper for use inside a Django or Flask view.

    Args:
        file_obj: An uploaded file object — e.g.
                  Django:  request.FILES["receipt"]
                  Flask:   request.files["receipt"]

    Returns:
        {
            "success": True | False,
            "data": { amount, currency, date, description, category, vendor },
            "quota": { requests_today, requests_remaining, tokens_today, ... },
            "warning": "..." | None     # present when _fallback is True
        }
    """
    try:
        # Compress before sending to reduce token usage
        image_bytes = compress_image(file_obj)
    except Exception as exc:
        return {
            "success": False,
            "error": f"Could not read image: {exc}",
            "data": GeminiManager._fallback_receipt("image_read_error"),
            "quota": {},
        }

    manager = _get_manager()
    result = manager.extract_receipt(image_bytes)
    stats = manager.quota_stats()

    is_fallback = result.pop("_fallback", False)
    fallback_reason = result.pop("_fallback_reason", None)

    response = {
        "success": not is_fallback,
        "data": result,
        "quota": stats,
    }

    if is_fallback:
        response["warning"] = (
            "Gemini OCR is temporarily unavailable (quota limit). "
            "Please fill in the receipt details manually. "
            f"Reason: {fallback_reason}"
        )

    return response


# ===========================================================================
# CLI Dashboard
# ===========================================================================
def print_dashboard() -> None:
    """Print current quota usage as a formatted dashboard to stdout."""

    # Load usage from file (doesn't need a live API connection)
    today = str(date.today())
    usage = {
        "date": today,
        "requests_today": 0,
        "tokens_today": 0,
        "last_updated": "never",
    }

    if USAGE_FILE.exists():
        try:
            with USAGE_FILE.open("r", encoding="utf-8") as f:
                stored = json.load(f)
            if stored.get("date") == today:
                usage = stored
            else:
                print(f"  (Usage file is from {stored.get('date')} — showing today as 0)")
        except json.JSONDecodeError:
            print("  (Could not parse usage file — showing today as 0)")

    req_today = usage["requests_today"]
    tok_today = usage["tokens_today"]
    req_pct = req_today / FREE_TIER_RPD * 100
    tok_pct = tok_today / FREE_TIER_TPD * 100

    req_bar = _bar(req_pct)
    tok_bar = _bar(tok_pct)

    status = "[OK]" if req_pct < 95 and tok_pct < 95 else "[BLOCKED - 95% limit hit]"
    if req_pct >= 100 or tok_pct >= 100:
        status = "[EXHAUSTED]"

    width = 52
    print("+" + "-" * width + "+")
    print("|" + "  GEMINI QUOTA DASHBOARD".center(width) + "|")
    print("+" + "=" * width + "+")
    print(f"|  {'Date:':<22} {usage['date']:<26} |")
    print(f"|  {'Last updated:':<22} {usage['last_updated'][:19]:<26} |")
    print("+" + "-" * width + "+")
    print(f"|  {'Requests today:':<22} {req_today:>5} / {FREE_TIER_RPD:<6} ({req_pct:5.1f}%)  |")
    print(f"|  {req_bar:<50}  |")
    print(f"|  {'Tokens today:':<22} {tok_today:>10,} / {FREE_TIER_TPD:<10,}   |")
    print(f"|  {tok_bar:<50}  |")
    print("+" + "-" * width + "+")
    print(f"|  {'RPM limit:':<22} {'15 req/min (sliding window)':<26} |")
    print(f"|  {'Daily req limit:':<22} {str(FREE_TIER_RPD) + ' requests':<26} |")
    print(f"|  {'Daily token limit:':<22} {str(FREE_TIER_TPD) + ' tokens':<26} |")
    print("+" + "-" * width + "+")
    print(f"|  {'Status:':<22} {status:<26} |")
    print("+" + "=" * width + "+")

    if req_pct >= 95 or tok_pct >= 95:
        print()
        print("  [i] Quota resets daily at midnight Pacific Time (UTC-8).")
        print("  [i] Monitor at: https://ai.dev/rate-limit")
        print("  [i] To increase limits, enable billing at: https://console.cloud.google.com")


def _bar(pct: float, width: int = 30) -> str:
    """Return a simple ASCII progress bar for a percentage value."""
    filled = int(min(pct, 100) / 100 * width)
    char = "#" if pct < 80 else ("+" if pct < 95 else "!")
    return f"  [{char * filled}{' ' * (width - filled)}] {pct:.1f}%"


# ===========================================================================
# Entry point — CLI dashboard
# ===========================================================================
if __name__ == "__main__":
    print()
    print_dashboard()
    print()

    # If called with --test, do a quick sanity check (no Gemini call)
    if "--test" in sys.argv:
        print("Running integration test (no Gemini call) …")
        manager = GeminiManager()
        print("  Manager created OK")
        print("  Quota stats:", json.dumps(manager.quota_stats(), indent=4))
        print("  Fallback receipt:", json.dumps(GeminiManager._fallback_receipt(), indent=4))
        print("[OK] All checks passed.")
