# import requests

# image_path = "test_receipt.png"  # put any receipt photo here

# with open(image_path, "rb") as f:
#     response = requests.post(
#         "http://localhost:5000/api/ocr-receipt",
#         files={"receipt": f}
#     )

# print(response.json())


from flask import Blueprint, request, jsonify
import pytesseract
from PIL import Image
import re
import requests
import io
HF_API_KEY = "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"


# Blueprint
ocr_bp = Blueprint('ocr', __name__)

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

DEFAULT_CURRENCY = "INR"


# ---------------- OCR ----------------
def extract_text(image_bytes):
    img = Image.open(io.BytesIO(image_bytes))
    img = img.convert("RGB")
    return pytesseract.image_to_string(img)


# ---------------- COUNTRY DATA ----------------
def load_country_currency_data():
    url = "https://restcountries.com/v3.1/all?fields=name,currencies"
    return requests.get(url, timeout=5).json()


def detect_country(text, data):
    text_lower = text.lower()
    for country in data:
        name = country.get("name", {}).get("common", "").lower()
        if name and name in text_lower:
            return country
    return None


def get_currency(country):
    if country and "currencies" in country:
        return list(country["currencies"].keys())[0]
    return ""


# ---------------- CONVERSION ----------------
def convert_currency(amount, currency):
    try:
        if not amount or not currency:
            return ""

        if currency == DEFAULT_CURRENCY:
            return amount

        url = f"https://api.exchangerate-api.com/v4/latest/{currency}"
        data = requests.get(url, timeout=5).json()

        rate = data["rates"].get(DEFAULT_CURRENCY)
        return round(amount * rate, 2) if rate else ""

    except:
        return ""


# ---------------- DATE ----------------
def extract_date(text):
    patterns = [
        r"\b\d{2}/\d{2}/\d{4}\b",
        r"\b\d{2}-\d{2}-\d{4}\b",
        r"\b\d{4}-\d{2}-\d{2}\b"
    ]

    for p in patterns:
        match = re.search(p, text)
        if match:
            raw = match.group(0)

            if "/" in raw:
                mm, dd, yyyy = raw.split("/")
                return f"{yyyy}-{mm}-{dd}"

            if "-" in raw and len(raw.split("-")[0]) == 2:
                mm, dd, yyyy = raw.split("-")
                return f"{yyyy}-{mm}-{dd}"

            return raw

    return ""


# ---------------- AMOUNT ----------------
def extract_amount(text):
    total_match = re.search(r"\btotal\b\s*[\$₹]?\s*(\d+[.,]\d{2})", text, re.IGNORECASE)

    if total_match:
        return float(total_match.group(1))

    amounts = re.findall(r"\d+[.,]\d{2}", text)
    amounts = [float(a) for a in amounts if float(a) > 10]

    return max(amounts) if amounts else ""


# ---------------- MAIN ROUTE ----------------
@ocr_bp.route('/api/ocr-receipt', methods=['POST'])
def ocr_receipt():
    file = request.files.get('receipt')

    if not file:
        return jsonify({"success": False, "error": "No file uploaded"})

    try:
        image_bytes = file.read()

        # OCR
        text = extract_text(image_bytes)

        # Extract
        amount = extract_amount(text)
        date = extract_date(text)

        country_data = load_country_currency_data()
        country = detect_country(text, country_data)
        currency = get_currency(country)

        converted = convert_currency(amount, currency) if amount and currency else ""

        lines = [l.strip() for l in text.split("\n") if l.strip()]
        vendor = lines[0] if lines else ""

        category = "Food" if "restaurant" in text.lower() else "Miscellaneous"

        return jsonify({
            "success": True,
            "data": {
                "amount": amount,
                "currency": currency,
                "amount_in_inr": converted,
                "date": date,
                "vendor": vendor,
                "category": category
            }
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })