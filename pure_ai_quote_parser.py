import openai
import os
import json
from dotenv import load_dotenv

load_dotenv()
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

system_prompt = """
You are AIBA, an intelligent business assistant. Extract quotation data from user input.
Return ONLY valid JSON with these fields:

REQUIRED FIELDS:
- customer_name: string or null
- items: array of {description, quantity, rate, amount}
- subtotal: number
- gst: number  
- grand_total: number
- missing_fields: array (always include ["address", "gstin", "email"] if not provided)

OPTIONAL FIELDS:
- terms: object with loading_charges, transport_charges, payment_terms (only include if explicitly mentioned)

CALCULATIONS:
- Convert all quantities to kg (1 MT = 1000 kg)
- Calculate: amount = quantity × rate
- subtotal = sum of all amounts
- gst = subtotal × 0.18
- grand_total = subtotal + gst

EXAMPLES:

Input: "Quote for ABC Company - 5 MT ISMC at ₹56/kg"
Output: {"customer_name": "ABC Company", "items": [{"description": "ISMC (5 MT)", "quantity": 5000, "rate": 56, "amount": 280000}], "subtotal": 280000, "gst": 50400, "grand_total": 330400, "missing_fields": ["address", "gstin", "email"]}

Input: "Quote for XYZ Ltd - 3 MT steel with loading included"  
Output: {"customer_name": "XYZ Ltd", "items": [{"description": "Steel (3 MT)", "quantity": 3000, "rate": 0, "amount": 0}], "subtotal": 0, "gst": 0, "grand_total": 0, "missing_fields": ["address", "gstin", "email", "rate"], "terms": {"loading_charges": "Included"}}

Input: "2 tons angles for DEF Corp, transport extra, advance payment"
Output: {"customer_name": "DEF Corp", "items": [{"description": "Angles (2 TON)", "quantity": 2000, "rate": 0, "amount": 0}], "subtotal": 0, "gst": 0, "grand_total": 0, "missing_fields": ["address", "gstin", "email", "rate"], "terms": {"transport_charges": "Extra", "payment_terms": "Advance"}}

Return ONLY the JSON object, no explanations.
"""

def extract_quote_with_ai(user_input):
    try:
        print(f"🤖 Processing: {user_input}")
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            temperature=0.2
        )
        
        ai_response = response.choices[0].message.content
        print(f"🤖 AI Response: {ai_response}")
        
        # Check if response is valid
        if not ai_response:
            print("❌ Empty AI response")
            return None
        
        # Try to parse JSON
        parsed_data = json.loads(ai_response)
        print(f"✅ Parsed successfully: {type(parsed_data)}")
        return parsed_data
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON Parse Error: {e}")
        print(f"❌ Raw AI Response: {response.choices[0].message.content if 'response' in locals() else 'No response'}")
        return None
    except Exception as e:
        print(f"❌ AI extraction failed: {e}")
        return None 