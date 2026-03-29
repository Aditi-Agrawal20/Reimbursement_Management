"""
list_models.py — List all Gemini models your API key can access.
Run:  python list_models.py
"""
from dotenv import load_dotenv
import os
from google import genai

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("\n📋 Available Gemini Models:\n")
print(f"{'Model Name':<40} {'Supported Methods'}")
print("-" * 80)

for model in client.models.list():
    methods = ", ".join(model.supported_actions) if hasattr(model, 'supported_actions') else "N/A"
    print(f"{model.name:<40} {methods}")

print()
