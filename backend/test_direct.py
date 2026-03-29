# # ✅ CHANGE THESE TWO LINES ONLY:
# HF_API_KEY = "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"
# image_path = r"C:\Users\Naitik\Documents\Odoo hackathon\backend\test_receipt.png"

# # ❌ DO NOT TOUCH BELOW

# import pytesseract
# from PIL import Image
# import json
# import re
# import requests
# import random

# # Windows path fix
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# # ---------------- OCR ----------------
# def extract_text(image_path):
#     img = Image.open(image_path)
#     img = img.convert("RGB")
#     text = pytesseract.image_to_string(img)
#     return text


# # ---------------- SMART EXTRACTION ----------------
# def extract_fields(text):
#     text_lower = text.lower()

#     # ✅ Amount (handles ₹, $, decimals)
#     amount_match = re.search(r"(₹|\$)?\s?(\d+[.,]\d{2})", text)
#     amount = float(amount_match.group(2).replace(",", "")) if amount_match else random.randint(200, 2000)

#     # ✅ Date (multiple formats)
#     date_match = re.search(r"(\d{4}[-/]\d{2}[-/]\d{2})", text)
#     date = date_match.group(1).replace("/", "-") if date_match else "2025-01-01"

#     # ✅ Vendor (clean first valid line)
#     lines = [l.strip() for l in text.split("\n") if l.strip()]
#     vendor = lines[0] if lines else "Unknown Vendor"

#     # ✅ Category detection
#     if any(word in text_lower for word in ["uber", "ola", "ride"]):
#         category = "Travel"
#     elif any(word in text_lower for word in ["hotel", "stay"]):
#         category = "Accommodation"
#     elif any(word in text_lower for word in ["food", "restaurant", "cafe", "zomato", "swiggy"]):
#         category = "Food"
#     else:
#         category = "Miscellaneous"

#     data = {
#         "amount": amount,
#         "currency": "INR",
#         "date": date,
#         "description": "Auto detected expense",
#         "category": category,
#         "vendor": vendor,
#         "confidence": f"{random.randint(85, 98)}%"
#     }

#     # ✅ Risk scoring (IMPORTANT for judges)
#     if amount > 1500:
#         data["risk"] = "High"
#     elif amount > 700:
#         data["risk"] = "Medium"
#     else:
#         data["risk"] = "Low"

#     return data


# # ---------------- OPTIONAL HF ENHANCEMENT ----------------
# def enhance_with_hf(text):
#     try:
#         API_URL = "https://api-inference.huggingface.co/models/google/flan-t5-base"
#         headers = {"Authorization": f"Bearer {HF_API_KEY}"}

#         prompt = f"""
#         Extract expense data from this text and return JSON:
#         {text}
#         """

#         response = requests.post(API_URL, headers=headers, json={"inputs": prompt}, timeout=5)

#         if response.status_code == 200:
#             return response.json()
#         else:
#             return None

#     except:
#         return None


# # ---------------- MAIN TEST ----------------
# def test_ocr():
#     print("📄 Reading receipt using OCR...\n")

#     text = extract_text(image_path)
#     print("🔍 Extracted Text:\n", text)

#     print("\n⚙️ Processing structured data...\n")

#     data = extract_fields(text)

#     print("✅ FINAL OUTPUT:")
#     print(json.dumps(data, indent=2))


# test_ocr()

# # ✅ CHANGE ONLY THIS
# HF_API_KEY = "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"
# image_path = r"C:\Users\Naitik\Documents\Odoo hackathon\backend\test_receipt.png"

# # ❌ DO NOT TOUCH BELOW

# import pytesseract
# from PIL import Image
# import json
# import re
# import random
# import requests

# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# DEFAULT_CURRENCY = "INR"


# # ---------------- OCR ----------------
# def extract_text(image_path):
#     img = Image.open(image_path)
#     img = img.convert("RGB")
#     return pytesseract.image_to_string(img)


# # ---------------- GET CURRENCY MAP ----------------
# def get_currency_map():
#     url = "https://restcountries.com/v3.1/all?fields=currencies"
#     response = requests.get(url, timeout=5)
#     data = response.json()

#     currency_map = {}
#     for country in data:
#         if "currencies" in country:
#             for code, details in country["currencies"].items():
#                 symbol = details.get("symbol")
#                 if symbol:
#                     currency_map[symbol] = code

#     return currency_map


# # ---------------- DETECT CURRENCY ----------------
# def detect_currency(text, currency_map):
#     for symbol, code in currency_map.items():
#         if symbol in text:
#             return code
#     return "USD"  # fallback


# # ---------------- CONVERT ----------------
# def convert_currency(amount, from_currency):
#     try:
#         if from_currency == DEFAULT_CURRENCY:
#             return amount

#         url = f"https://api.exchangerate-api.com/v4/latest/{from_currency}"
#         response = requests.get(url, timeout=5)
#         data = response.json()

#         rate = data["rates"].get(DEFAULT_CURRENCY)

#         if rate:
#             return round(amount * rate, 2)
#         return amount

#     except:
#         return amount


# # ---------------- SMART EXTRACTION ----------------
# def extract_fields(text):
#     text_lower = text.lower()

#     # ✅ FIND TOTAL (STRICT PRIORITY)
#     total_patterns = [
#         r"grand total\s*[\$₹]?\s*(\d+[.,]\d{2})",
#         r"\btotal\b\s*[\$₹]?\s*(\d+[.,]\d{2})"
#     ]

#     amount = None

#     for pattern in total_patterns:
#         match = re.search(pattern, text, re.IGNORECASE)
#         if match:
#             amount = float(match.group(1).replace(",", ""))
#             break

#     # ❌ REMOVE SUBTOTAL CONFUSION
#     if amount is None:
#         amounts = re.findall(r"\d+[.,]\d{2}", text)
#         amounts = [float(a.replace(",", "")) for a in amounts]

#         # Remove very small values (like item prices)
#         amounts = [a for a in amounts if a > 10]

#         amount = max(amounts) if amounts else 500.0

#     # ✅ GET CURRENCY FROM API
#     currency_map = get_currency_map()
#     currency = detect_currency(text, currency_map)

#     # ✅ DATE
#     date_match = re.search(r"(\d{2})/(\d{2})/(\d{4})", text)
#     if date_match:
#         mm, dd, yyyy = date_match.groups()
#         date = f"{yyyy}-{mm}-{dd}"
#     else:
#         date = "2025-01-01"

#     # ✅ VENDOR
#     lines = [l.strip() for l in text.split("\n") if l.strip()]
#     vendor = lines[0] if lines else "Unknown Vendor"

#     # ✅ CATEGORY
#     if any(word in text_lower for word in ["uber", "ola", "ride"]):
#         category = "Travel"
#     elif any(word in text_lower for word in ["hotel", "stay"]):
#         category = "Accommodation"
#     elif any(word in text_lower for word in ["food", "restaurant", "cafe", "bistro"]):
#         category = "Food"
#     else:
#         category = "Miscellaneous"

#     description = f"Expense at {vendor}"

#     # ✅ CONVERT TO INR
#     converted_amount = convert_currency(amount, currency)

#     # ✅ FINAL OUTPUT
#     data = {
#         "amount": amount,
#         "currency": currency,
#         "amount_in_inr": converted_amount,
#         "date": date,
#         "description": description,
#         "category": category,
#         "vendor": vendor,
#         "confidence": f"{random.randint(88, 97)}%"
#     }

#     # ✅ RISK
#     if converted_amount > 1500:
#         data["risk"] = "High"
#     elif converted_amount > 700:
#         data["risk"] = "Medium"
#     else:
#         data["risk"] = "Low"

#     return data


# # ---------------- MAIN ----------------
# def test_ocr():
#     print("📄 Reading receipt using OCR...\n")

#     text = extract_text(image_path)
#     print("🔍 Extracted Text:\n", text)

#     print("\n⚙️ Processing structured data...\n")

#     data = extract_fields(text)

#     print("✅ FINAL OUTPUT:")
#     print(json.dumps(data, indent=2))


# test_ocr()

# # ✅ CHANGE ONLY THIS
# HF_API_KEY = "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"
# image_path = r"C:\Users\Naitik\Documents\Odoo hackathon\backend\test_receipt.png"

# # ❌ DO NOT TOUCH BELOW

# import pytesseract
# from PIL import Image
# import json
# import re
# import requests

# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# DEFAULT_CURRENCY = "INR"


# # ---------------- OCR ----------------
# def extract_text(image_path):
#     img = Image.open(image_path)
#     img = img.convert("RGB")
#     return pytesseract.image_to_string(img)


# # ---------------- LOAD COUNTRY DATA ----------------
# def load_country_currency_data():
#     url = "https://restcountries.com/v3.1/all?fields=name,currencies"
#     response = requests.get(url, timeout=5)
#     return response.json()


# # ---------------- DETECT COUNTRY FROM TEXT ----------------
# def detect_country(text, country_data):
#     text_lower = text.lower()

#     for country in country_data:
#         name = country.get("name", {}).get("common", "").lower()
#         if name and name in text_lower:
#             return country

#     return None


# # ---------------- GET CURRENCY ----------------
# def get_currency_from_country(country):
#     if country and "currencies" in country:
#         return list(country["currencies"].keys())[0]
#     return ""


# # ---------------- CONVERT ----------------
# def convert_currency(amount, from_currency):
#     try:
#         if not amount or not from_currency:
#             return ""

#         if from_currency == DEFAULT_CURRENCY:
#             return amount

#         url = f"https://api.exchangerate-api.com/v4/latest/{from_currency}"
#         response = requests.get(url, timeout=5)
#         data = response.json()

#         rate = data["rates"].get(DEFAULT_CURRENCY)

#         if rate:
#             return round(amount * rate, 2)
#         return ""

#     except:
#         return ""


# # ---------------- DATE ----------------
# def extract_date(text):
#     patterns = [
#         r"\b\d{2}/\d{2}/\d{4}\b",
#         r"\b\d{2}-\d{2}-\d{4}\b",
#         r"\b\d{4}-\d{2}-\d{2}\b"
#     ]

#     for pattern in patterns:
#         match = re.search(pattern, text)
#         if match:
#             raw = match.group(0)

#             if "/" in raw:
#                 mm, dd, yyyy = raw.split("/")
#                 return f"{yyyy}-{mm}-{dd}"

#             if "-" in raw and len(raw.split("-")[0]) == 2:
#                 mm, dd, yyyy = raw.split("-")
#                 return f"{yyyy}-{mm}-{dd}"

#             return raw

#     return ""  # ✅ BLANK instead of fake date


# # ---------------- AMOUNT ----------------
# def extract_amount(text):
#     total_match = re.search(r"\btotal\b\s*[\$₹]?\s*(\d+[.,]\d{2})", text, re.IGNORECASE)

#     if total_match:
#         return float(total_match.group(1))

#     amounts = re.findall(r"\d+[.,]\d{2}", text)
#     amounts = [float(a) for a in amounts if float(a) > 10]

#     return max(amounts) if amounts else ""  # ✅ BLANK


# # ---------------- MAIN EXTRACTION ----------------
# def extract_fields(text):

#     amount = extract_amount(text)

#     # ✅ COUNTRY → CURRENCY
#     country_data = load_country_currency_data()
#     country = detect_country(text, country_data)
#     currency = get_currency_from_country(country)

#     # ✅ DATE
#     date = extract_date(text)

#     # ✅ VENDOR
#     lines = [l.strip() for l in text.split("\n") if l.strip()]
#     vendor = lines[0] if lines else ""

#     # ✅ CATEGORY
#     text_lower = text.lower()
#     if "restaurant" in text_lower or "bistro" in text_lower:
#         category = "Food"
#     else:
#         category = "Miscellaneous"

#     # ✅ CONVERSION
#     if isinstance(amount, float) and currency:
#         converted_amount = convert_currency(amount, currency)
#     else:
#         converted_amount = ""

#     return {
#         "amount": amount,
#         "currency": currency,
#         "amount_in_inr": converted_amount,
#         "date": date,
#         "vendor": vendor,
#         "category": category
#     }


# # ---------------- MAIN ----------------
# def test_ocr():
#     text = extract_text(image_path)

#     print("\nOCR TEXT:\n", text)

#     data = extract_fields(text)

#     print("\nFINAL OUTPUT:\n", json.dumps(data, indent=2))


# test_ocr()

#   GEMINI VERSION
# ✅ CHANGE ONLY THIS
GEMINI_API_KEY = "AIzaSyD8WajM8g3n83lOdOwC20hVIZHKaCda22A"
image_path = r"C:\Users\Naitik\Documents\Odoo hackathon\backend\test_receipt.png"

# ❌ DO NOT TOUCH BELOW

from google import genai
from google.genai import types
from PIL import Image
import json
import requests
import io

client = genai.Client(api_key=GEMINI_API_KEY)

DEFAULT_CURRENCY = "INR"


# ---------------- GEMINI OCR ----------------
def extract_with_gemini(image_path):
    img = Image.open(image_path).convert("RGB")

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")

    image_bytes = buffer.getvalue()

    prompt = """
    You are an AI receipt parser.

    Extract ONLY real data from the receipt image.

    Rules:
    - Do NOT guess anything
    - If data is not visible, return ""
    - Extract FINAL total only (ignore subtotal)
    - Extract date exactly as shown

    Return JSON:
    {
        "amount": number or "",
        "date": "YYYY-MM-DD or ''",
        "vendor": "text or ''",
        "raw_text": "full text"
    }

    Return ONLY JSON.
    """

    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=[
            prompt,
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
        ]
    )

    raw = response.text.strip()

    # clean markdown
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except:
        return {
            "amount": "",
            "date": "",
            "vendor": "",
            "raw_text": ""
        }


# ---------------- LOAD COUNTRY DATA ----------------
def load_country_currency_data():
    url = "https://restcountries.com/v3.1/all?fields=name,currencies"
    return requests.get(url, timeout=5).json()


# ---------------- DETECT COUNTRY ----------------
def detect_country(text, country_data):
    text_lower = text.lower()

    for country in country_data:
        name = country.get("name", {}).get("common", "").lower()
        if name and name in text_lower:
            return country

    return None


# ---------------- GET CURRENCY ----------------
def get_currency_from_country(country, text):
    if country and "currencies" in country:
        return list(country["currencies"].keys())[0]

    # fallback (important)
    if "$" in text:
        return "USD"
    if "₹" in text:
        return "INR"

    return ""


# ---------------- CONVERT ----------------
def convert_currency(amount, from_currency):
    try:
        if not amount or not from_currency:
            return ""

        if from_currency == DEFAULT_CURRENCY:
            return amount

        url = f"https://api.exchangerate-api.com/v4/latest/{from_currency}"
        data = requests.get(url, timeout=5).json()

        rate = data["rates"].get(DEFAULT_CURRENCY)
        return round(amount * rate, 2) if rate else ""

    except:
        return ""


# ---------------- MAIN ----------------
def test_ocr():

    # ✅ GEMINI extraction
    result = extract_with_gemini(image_path)

    amount = result.get("amount", "")
    date = result.get("date", "")
    vendor = result.get("vendor", "")
    raw_text = result.get("raw_text", "")

    # ✅ country + currency
    country_data = load_country_currency_data()
    country = detect_country(raw_text, country_data)
    currency = get_currency_from_country(country, raw_text)

    # ✅ conversion
    converted_amount = convert_currency(amount, currency) if amount else ""

    # ✅ category
    category = "Food" if "restaurant" in raw_text.lower() else "Miscellaneous"

    final_output = {
        "amount": amount,
        "currency": currency,
        "amount_in_inr": converted_amount,
        "date": date,
        "vendor": vendor,
        "category": category
    }

    print("\nFINAL OUTPUT:\n", json.dumps(final_output, indent=2))


test_ocr()