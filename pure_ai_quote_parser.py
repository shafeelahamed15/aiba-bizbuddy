import openai
import os
import json
from dotenv import load_dotenv

load_dotenv()
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

system_prompt = """
You are AIBA, an intelligent business assistant. Extract quotation data from user input.
Return structured JSON with:
- customer_name
- items: [{description, quantity (kg), rate, amount}]
- subtotal, gst, grand_total
- missing_fields: list of any missing: address, gstin, email
- terms: {loading_charges, transport_charges, payment_terms} (only if mentioned)

CALCULATIONS:
- Convert all quantities to kg (1 MT = 1000 kg)
- Calculate: amount = quantity_kg × rate_per_kg
- subtotal = sum of all amounts
- gst = subtotal × 0.18 (18% GST)
- grand_total = subtotal + gst

STEEL WEIGHTS:
Use (thickness × width × length × 7.85 × nos / 1,000,000) for steel plate weight.

TERMS EXTRACTION:
- Only include "terms" field if loading/transport/payment are explicitly mentioned
- Examples: "loading included" → "loading_charges": "Included"
- Examples: "transport extra" → "transport_charges": "Extra"
- Examples: "advance payment" → "payment_terms": "Advance"
- If not mentioned, don't include terms field

EXAMPLES:
Input: "Quote for ABC Company - 5 MT ISMC at ₹56/kg with loading included"
Output: {"customer_name": "ABC Company", "items": [...], "terms": {"loading_charges": "Included"}}

Input: "10 tons steel for XYZ Ltd, transport by customer, advance payment required"
Output: {"customer_name": "XYZ Ltd", "items": [...], "terms": {"transport_charges": "By Customer", "payment_terms": "Advance Required"}}

ALWAYS include ALL calculated fields in your response.
"""

def extract_quote_with_ai(user_input):
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            temperature=0.2
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print("AI failed:", e)
        return None 