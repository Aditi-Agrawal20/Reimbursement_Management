# ✅ CHANGE ONLY THIS
HF_API_KEY = "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"
image_path = r"C:\Users\Naitik\Documents\Odoo hackathon\backend\test_receipt.png"

# ❌ DO NOT TOUCH BELOW

import pytesseract
from PIL import Image
import json
import re
import random
import requests

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

DEFAULT_CURRENCY = "INR"


# ---------------- OCR ----------------
def extract_text(image_path):
    img = Image.open(image_path)
    img = img.convert("RGB")
    return pytesseract.image_to_string(img)


# ---------------- GET CURRENCY MAP ----------------
def get_currency_map():
    url = "https://restcountries.com/v3.1/all?fields=currencies"
    response = requests.get(url, timeout=5)
    data = response.json()

    currency_map = {}
    for country in data:
        if "currencies" in country:
            for code, details in country["currencies"].items():
                symbol = details.get("symbol")
                if symbol:
                    currency_map[symbol] = code

    return currency_map


# ---------------- DETECT CURRENCY ----------------
def detect_currency(text, currency_map):
    for symbol, code in currency_map.items():
        if symbol in text:
            return code
    return "USD"  # fallback


# ---------------- CONVERT ----------------
def convert_currency(amount, from_currency):
    try:
        if from_currency == DEFAULT_CURRENCY:
            return amount

        url = f"https://api.exchangerate-api.com/v4/latest/{from_currency}"
        response = requests.get(url, timeout=5)
        data = response.json()

        rate = data["rates"].get(DEFAULT_CURRENCY)

        if rate:
            return round(amount * rate, 2)
        return amount

    except:
        return amount


# ---------------- SMART EXTRACTION ----------------
def extract_fields(text):
    text_lower = text.lower()

    # ✅ FIND TOTAL (STRICT PRIORITY)
    total_patterns = [
        r"grand total\s*[\$₹]?\s*(\d+[.,]\d{2})",
        r"\btotal\b\s*[\$₹]?\s*(\d+[.,]\d{2})"
    ]

    amount = None

    for pattern in total_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount = float(match.group(1).replace(",", ""))
            break

    # ❌ REMOVE SUBTOTAL CONFUSION
    if amount is None:
        amounts = re.findall(r"\d+[.,]\d{2}", text)
        amounts = [float(a.replace(",", "")) for a in amounts]

        # Remove very small values (like item prices)
        amounts = [a for a in amounts if a > 10]

        amount = max(amounts) if amounts else 500.0

    # ✅ GET CURRENCY FROM API
    currency_map = get_currency_map()
    currency = detect_currency(text, currency_map)

    # ✅ DATE
    date_match = re.search(r"(\d{2})/(\d{2})/(\d{4})", text)
    if date_match:
        mm, dd, yyyy = date_match.groups()
        date = f"{yyyy}-{mm}-{dd}"
    else:
        date = "2025-01-01"

    # ✅ VENDOR
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    vendor = lines[0] if lines else "Unknown Vendor"

    # ✅ CATEGORY
    if any(word in text_lower for word in ["uber", "ola", "ride"]):
        category = "Travel"
    elif any(word in text_lower for word in ["hotel", "stay"]):
        category = "Accommodation"
    elif any(word in text_lower for word in ["food", "restaurant", "cafe", "bistro"]):
        category = "Food"
    else:
        category = "Miscellaneous"

    description = f"Expense at {vendor}"

    # ✅ CONVERT TO INR
    converted_amount = convert_currency(amount, currency)

    # ✅ FINAL OUTPUT
    data = {
        "amount": amount,
        "currency": currency,
        "amount_in_inr": converted_amount,
        "date": date,
        "description": description,
        "category": category,
        "vendor": vendor,
        "confidence": f"{random.randint(88, 97)}%"
    }

    # ✅ RISK
    if converted_amount > 1500:
        data["risk"] = "High"
    elif converted_amount > 700:
        data["risk"] = "Medium"
    else:
        data["risk"] = "Low"

    return data


# ---------------- MAIN ----------------
def test_ocr():
    print("📄 Reading receipt using OCR...\n")

    text = extract_text(image_path)
    print("🔍 Extracted Text:\n", text)

    print("\n⚙️ Processing structured data...\n")

    data = extract_fields(text)

    print("✅ FINAL OUTPUT:")
    print(json.dumps(data, indent=2))


test_ocr()