import openai
import os
import json
from dotenv import load_dotenv

load_dotenv()

def get_client():
    """Get OpenAI client with proper error handling."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set")
    return openai.OpenAI(api_key=api_key)

system_prompt = """
You are AIBA, an intelligent business assistant. Extract quotation data from user input.
Return structured JSON with:
- customer_name
- items: [{description, quantity (kg), rate, amount}]
- subtotal, gst, grand_total
- missing_fields: list of any missing REQUIRED fields (exclude address, gstin, email as they're handled separately)

CALCULATIONS:
- Convert all quantities to kg (1 MT = 1000 kg)
- Calculate: amount = quantity_kg × rate_per_kg
- subtotal = sum of all amounts
- gst = subtotal × 0.18 (18% GST)
- grand_total = subtotal + gst

STEEL WEIGHTS:
Use (thickness × width × length × 7.85 × nos / 1,000,000) for steel plate weight.

IMPORTANT: Do NOT include address, gstin, or email in missing_fields - these are optional.
ALWAYS include ALL calculated fields in your response.
"""

def extract_quote_with_ai(user_input):
    try:
        client = get_client()
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            temperature=0.2
        )
        content = response.choices[0].message.content
        if content is None:
            return None
        return json.loads(content)
    except Exception as e:
        print("AI failed:", e)
        return None 