"""
AIBA Quote Brain - AI-Powered Field Extractor
Phase 1: Replace Rule-Based Engine with OpenAI Intelligence
Phase 2: Replace FSM with Simple Quote Draft State
"""

from dotenv import load_dotenv
import os
import json
import re
from typing import Dict, Optional, List
from datetime import datetime
from openai import OpenAI
from pure_ai_quote_parser import extract_quote_with_ai

# ✅ Load environment variables from .env file
load_dotenv()

class QuoteDraftState:
    """
    Simple state holder for quote drafts - replaces complex FSM
    """
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        """Reset to initial state"""
        self.state = {
            "customer_name": None,
            "material": None,
            "quantity": None,
            "rate": None,
            "amount": None,
            "subtotal": None,
            "gst": None,
            "grand_total": None,
            "missing_fields": [],  # ❌ REMOVED: Static initialization - AI determines missing fields
            "terms": {
                "loading": None,
                "transport": None, 
                "payment": None
            },
            "customer_details": {
                "address": None,
                "gstin": None,
                "email": None
            },
            "items": [],
            "confidence": 0.0,
            "extraction_method": "none",
            "original_input": None,
            "last_updated": None,
            "status": "empty"  # empty, partial, complete, ready
        }
    
    def update_from_ai_extraction(self, ai_data: Dict):
        """Update state from AI extraction results"""
        if not ai_data:
            return
            
        # Update basic fields
        if ai_data.get('customer_name'):
            self.state['customer_name'] = ai_data['customer_name']
        
        # Handle material mapping
        if ai_data.get('material_description'):
            self.state['material'] = ai_data['material_description']
        elif ai_data.get('items') and len(ai_data['items']) > 0:
            # Extract material from first item if available
            first_item = ai_data['items'][0]
            self.state['material'] = first_item.get('description', 'Steel Material')
        
        # Handle quantity mapping - for multi-item quotes, sum all quantities
        if ai_data.get('quantity'):
            self.state['quantity'] = ai_data['quantity']
        elif ai_data.get('quantity_kg'):
            self.state['quantity'] = ai_data['quantity_kg']
        elif ai_data.get('items') and len(ai_data['items']) > 0:
            # Sum all item quantities for total weight
            total_quantity = sum(float(item.get('quantity', 0) or item.get('quantity_kg', 0)) 
                               for item in ai_data['items'])
            self.state['quantity'] = total_quantity
            
        # Handle rate mapping - for multi-item quotes, use weighted average
        if ai_data.get('rate'):
            self.state['rate'] = ai_data['rate']
        elif ai_data.get('rate_per_kg'):
            self.state['rate'] = ai_data['rate_per_kg']
        elif ai_data.get('items') and len(ai_data['items']) > 0:
            # Calculate weighted average rate
            total_amount = sum(float(item.get('amount', 0)) for item in ai_data['items'])
            total_quantity = sum(float(item.get('quantity', 0) or item.get('quantity_kg', 0)) 
                               for item in ai_data['items'])
            if total_quantity > 0:
                self.state['rate'] = round(total_amount / total_quantity, 2)
            else:
                # Fallback to first item rate
                first_item = ai_data['items'][0]
                self.state['rate'] = first_item.get('rate_per_kg') or first_item.get('rate', 0)
            
        # Handle amount mapping - sum all item amounts
        if ai_data.get('amount'):
            self.state['amount'] = ai_data['amount']
        elif ai_data.get('items') and len(ai_data['items']) > 0:
            # Sum all item amounts
            total_amount = sum(float(item.get('amount', 0)) for item in ai_data['items'])
            self.state['amount'] = total_amount
            
        # ✅ Map subtotal field from AI data
        if ai_data.get('subtotal'):
            self.state['subtotal'] = ai_data['subtotal']
        elif ai_data.get('amount'):
            # Fallback: use amount as subtotal if subtotal not provided
            self.state['subtotal'] = ai_data['amount']
            
        # Handle GST mapping
        if ai_data.get('gst_amount'):
            self.state['gst'] = ai_data['gst_amount']
        elif ai_data.get('gst'):
            self.state['gst'] = ai_data['gst']
            
        if ai_data.get('grand_total'):
            self.state['grand_total'] = ai_data['grand_total']
        
        # Update items with enrichment
        if ai_data.get('items'):
            self.state['items'] = self.enrich_items(ai_data['items'])
            # Recalculate totals after enrichment
            self.recalculate_totals()
        
        # Update missing fields from AI
        if ai_data.get('missing_fields'):
            self.state['missing_fields'] = ai_data['missing_fields']
        
        # Update terms if provided (only non-null values)
        if ai_data.get('terms'):
            for term_key, term_value in ai_data['terms'].items():
                if term_value is not None:
                    self.state['terms'][term_key] = term_value
        
        # Update metadata
        self.state['confidence'] = ai_data.get('confidence', 0.0)
        self.state['extraction_method'] = ai_data.get('extraction_method', 'ai_powered')
        self.state['original_input'] = ai_data.get('original_input', '')
        self.state['last_updated'] = datetime.now().isoformat()
        
        # Update status
        self._update_status()
    
    def update_customer_detail(self, field: str, value: str):
        """Update a specific customer detail"""
        if field in self.state['customer_details']:
            self.state['customer_details'][field] = value
            
            # Always remove from missing fields when field is updated (even if skipped/empty)
            if field in self.state['missing_fields']:
                self.state['missing_fields'].remove(field)
            
            # ✅ Customer fields are optional - always clear them from missing_fields
            self.state['missing_fields'] = [f for f in self.state['missing_fields'] 
                                          if f not in ['address', 'gstin', 'email']]
        
        self.state['last_updated'] = datetime.now().isoformat()
        self._update_status()
    
    def update_term(self, term_type: str, value: str):
        """Update terms and conditions"""
        if term_type in self.state['terms']:
            self.state['terms'][term_type] = value or "Included"
        
        self.state['last_updated'] = datetime.now().isoformat()
        self._update_status()
    
    def ensure_terms_defaults(self):
        """Ensure all terms have default values if not set"""
        for term_type in ['loading', 'transport', 'payment']:
            if not self.state['terms'].get(term_type):
                self.state['terms'][term_type] = "Included"
    
    def enrich_items(self, items):
        """
        Enrich items with correct steel weight calculations and amounts
        """
        import re
        
        enriched_items = []
        for item in items:
            try:
                # Make a copy of the item
                enriched_item = item.copy()
                
                # Look for steel plate dimensions in description
                # Patterns: "10x1500x3000 - 2 Nos", "12x1250×2500 – 4 Nos", etc.
                desc = item.get("description", "")
                
                # Try multiple patterns for steel dimensions
                patterns = [
                    r"(\d+)[x×](\d+)[x×](\d+).*?(\d+)\s*Nos",  # "10x1500x3000 - 2 Nos"
                    r"(\d+)mm\s*[x×]\s*(\d+)\s*[x×]\s*(\d+).*?(\d+)\s*Nos",  # "10mm x 1500 x 3000 - 2 Nos"
                    r"(\d+)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+).*?(\d+)\s*(?:nos|pcs|plates?)",  # More flexible
                ]
                
                match = None
                for pattern in patterns:
                    match = re.search(pattern, desc, re.IGNORECASE)
                    if match:
                        break
                
                if match:
                    thk = int(match.group(1))
                    width = int(match.group(2))
                    length = int(match.group(3))
                    nos = int(match.group(4))

                    # Calculate correct weight using steel formula
                    weight = round((thk * width * length * 7.85 * nos) / 1_000_000, 2)
                    
                    # Get rate from item
                    rate = float(item.get("rate", 0)) or float(item.get("rate_per_kg", 0))
                    
                    # Update item with correct values
                    enriched_item["quantity"] = weight
                    enriched_item["rate"] = rate
                    enriched_item["amount"] = round(weight * rate, 2)
                    
                    print(f"✅ Enriched: {desc} -> {weight} kg @ ₹{rate}/kg = ₹{enriched_item['amount']}")
                else:
                    # No steel dimensions found, use original values
                    quantity = float(item.get("quantity", 0)) or float(item.get("quantity_kg", 0))
                    rate = float(item.get("rate", 0)) or float(item.get("rate_per_kg", 0))
                    
                    enriched_item["quantity"] = quantity
                    enriched_item["rate"] = rate
                    enriched_item["amount"] = round(quantity * rate, 2)
                
                enriched_items.append(enriched_item)
                
            except Exception as e:
                print(f"⚠️ Error enriching item {item}: {e}")
                # Keep original item if enrichment fails
                enriched_items.append(item)
        
        return enriched_items
    
    def recalculate_totals(self):
        """Recalculate subtotal, GST, and grand total based on enriched items"""
        if not self.state.get('items'):
            return
        
        # Calculate subtotal from all items
        subtotal = sum(float(item.get('amount', 0)) for item in self.state['items'])
        
        # Calculate GST (18%)
        gst = round(subtotal * 0.18, 2)
        
        # Calculate grand total
        grand_total = round(subtotal + gst, 2)
        
        # Update state
        self.state['subtotal'] = subtotal
        self.state['amount'] = subtotal  # For compatibility
        self.state['gst'] = gst
        self.state['grand_total'] = grand_total
        
        print(f"📊 Recalculated totals: Subtotal=₹{subtotal}, GST=₹{gst}, Grand Total=₹{grand_total}")
    
    def _update_status(self):
        """Update the overall status based on current data"""
        required_fields = ['customer_name', 'material', 'quantity', 'rate']
        
        if not any(self.state.get(field) for field in required_fields):
            self.state['status'] = 'empty'
        elif all(self.state.get(field) for field in required_fields):
            # ✅ Set to ready - customer details (address, gstin, email) are optional
            self.state['status'] = 'ready'
            # Clear any customer detail fields from missing_fields as they're not required
            self.state['missing_fields'] = [f for f in self.state['missing_fields'] 
                                          if f not in ['address', 'gstin', 'email']]
        else:
            self.state['status'] = 'partial'
    
    def get_missing_customer_fields(self):
        """Get list of missing customer fields - returns empty since address/gstin/email are optional"""
        # Customer details are optional for Tally integration - don't return them as missing
        return []
    
    def is_ready_for_pdf(self):
        """Check if state is ready for PDF generation"""
        # ✅ Smart State Check: Check required fields first
        required_fields = ["customer_name", "quantity", "rate", "amount", "subtotal", "gst", "grand_total"]
        missing_required = [f for f in required_fields if not self.state.get(f)]
        
        if missing_required:
            return False
        
        # ✅ Filter out customer details from missing_fields as they're optional
        essential_missing = [f for f in self.state.get("missing_fields", []) 
                           if f not in ['address', 'gstin', 'email']]
        
        if essential_missing:
            return False
        
        # ✅ Ensure terms have defaults before declaring ready
        self.ensure_terms_defaults()
            
        # ✅ All required data present and no essential missing fields - ready for PDF!
        return True
    
    def to_pdf_format(self):
        """Convert state to format expected by PDF generators"""
        return {
            'customer_name': self.state['customer_name'],
            'customer_address': self.state['customer_details']['address'] or '',
            'customer_gstin': self.state['customer_details']['gstin'] or '',
            'customer_email': self.state['customer_details']['email'] or '',
            'items': self.state['items'] or [{
                'description': self.state['material'] or 'Steel Material',
                'quantity': self.state['quantity'] or 0,
                'rate': self.state['rate'] or 0,
                'amount': self.state['amount'] or 0
            }],
            'subtotal': self.state.get('subtotal') or self.state.get('amount') or 0,
            'gst_amount': self.state['gst'] or 0,
            'grand_total': self.state['grand_total'] or 0,
            'loading_charges': self.state['terms']['loading'] or 'Included',
            'transport_charges': self.state['terms']['transport'] or 'Included',
            'payment_terms': self.state['terms']['payment'] or 'Included'
        }
    
    def get_summary(self):
        """Get a human-readable summary of current state"""
        summary = f"**Quote Draft Status: {self.state['status'].title()}**\n\n"
        
        if self.state['customer_name']:
            summary += f"**Customer:** {self.state['customer_name']}\n"
        
        if self.state['material']:
            summary += f"**Material:** {self.state['material']}\n"
        
        if self.state['quantity']:
            summary += f"**Quantity:** {self.state['quantity']} kg\n"
        
        if self.state['rate']:
            summary += f"**Rate:** ₹{self.state['rate']}/kg\n"
        
        if self.state['grand_total']:
            summary += f"**Grand Total:** ₹{self.state['grand_total']:,.2f}\n"
        
        if self.state['missing_fields']:
            summary += f"\n**Missing:** {', '.join(self.state['missing_fields'])}\n"
        
        if self.state['confidence']:
            summary += f"\n**AI Confidence:** {self.state['confidence']*100:.0f}%\n"
        
        return summary


class QuoteBrain:
    def __init__(self):
        """Initialize the AI-powered quote brain."""
        self.client = None  # Lazy load when needed
        
        # Steel industry knowledge for validation
        self.steel_weights = {
            'ismc 75': 7.14, 'ismc 100': 9.56, 'ismc 125': 13.1, 'ismc 150': 16.4,
            'ismc 175': 20.7, 'ismc 200': 25.1, 'ismc 225': 30.6, 'ismc 250': 36.3,
            'ismb 100': 11.5, 'ismb 125': 13.7, 'ismb 150': 17.9, 'ismb 175': 22.8,
            'ismb 200': 25.4, 'ismb 225': 29.9, 'ismb 250': 37.3, 'ismb 300': 46.1,
            'angle 25x25x3': 1.11, 'angle 50x50x5': 3.77, 'angle 75x75x6': 6.85
        }
        
        self.system_prompt = """
You are AIBA, an intelligent business assistant specialized in steel trading and quotations.

TASK: Extract structured information from quotation requests and return VALID JSON.

STEEL INDUSTRY KNOWLEDGE:
- ISMC = Indian Standard Medium Channel
- ISMB = Indian Standard Medium Beam  
- MT = Metric Ton (1000 kg)
- Common materials: ISMC, ISMB, angles, plates, rounds
- Rates typically quoted per kg
- GST is 18% in India
- Only include terms if explicitly mentioned in input (loading, transport, payment)

EXTRACTION RULES:
1. Convert all quantities to kg (1 MT = 1000 kg, 1 TON = 1000 kg)
2. Calculate: amount = quantity_kg × rate_per_kg
3. Calculate: gst = amount × 0.18
4. Calculate: grand_total = amount + gst
5. Preserve original unit display (e.g., "5 MT" becomes quantity: 5000, original_unit: "5 MT")

REQUIRED JSON OUTPUT:
{
    "success": true,
    "customer_name": "extracted name or null",
    "material_description": "ISMC 100x50 (5 MT)" or "material description",
    "quantity": 5000,
    "original_unit": "5 MT",
    "rate": 56.0,
    "rate_unit": "per kg",
    "amount": 280000.0,
    "subtotal": 280000.0,
    "gst_rate": 18,
    "gst_amount": 50400.0,
    "grand_total": 330400.0,
    "missing_fields": [],
    "confidence": 0.95,
    "intent": "quotation",
    "items": [
        {
            "description": "ISMC 100x50 (5 MT)",
            "quantity": 5000,
            "rate": 56.0,
            "amount": 280000.0
        }
    ],
    "terms": {
        "loading_charges": null,
        "transport_charges": null, 
        "payment_terms": null
    }
}

EXAMPLES:
Input: "Quote for ABC Company – 5 MT ISMC 100x50 at ₹56/kg"
Output: {"success": true, "customer_name": "ABC Company", "material_description": "ISMC 100x50 (5 MT)", "quantity": 5000, "rate": 56.0, "amount": 280000.0, "gst_amount": 50400.0, "grand_total": 330400.0, "missing_fields": []}

Input: "Need 10 tons steel angles for XYZ Ltd with loading included"
Output: {"success": true, "customer_name": "XYZ Ltd", "material_description": "steel angles (10 TON)", "quantity": 10000, "rate": null, "missing_fields": ["rate"], "terms": {"loading_charges": "Included", "transport_charges": null, "payment_terms": null}}

Input: "Need 10 tons steel angles for XYZ Ltd"
Output: {"success": true, "customer_name": "XYZ Ltd", "material_description": "steel angles (10 TON)", "quantity": 10000, "rate": null, "missing_fields": ["rate"]}

Input: "create a quotation for Dee Dee Engineering Enterprises E46, Developed Plots Estate Thuvakudy, Trichy - 620015 ddengg1@gmail.com Info@ddengg.in ---GST : 33AADFD0235D1ZA------10x1250x6300- 4nos @84 12x1250×2500 - 2 nos @84 SA 515 Grade 70 10x1500x3500 - 1 nos @105 12x1500x1250 - 1 nos @105 (Sail Hard Plate - Material Description)"
Output: {"success": true, "customer_name": "Dee Dee Engineering Enterprises", "customer_address": "E46, Developed Plots Estate Thuvakudy, Trichy - 620015", "customer_email": "ddengg1@gmail.com, Info@ddengg.in", "customer_gstin": "33AADFD0235D1ZA", "items": [{"description": "10mm x 1250 x 6300 - 4 Nos (Sail Hard Plate)", "quantity": 393.75, "rate": 84.0, "amount": 33075.00}, {"description": "12mm x 1250 x 2500 - 2 Nos (Sail Hard Plate)", "quantity": 147.19, "rate": 84.0, "amount": 12363.96}, {"description": "10mm x 1500 x 3500 - 1 Nos (SA 515 Grade 70)", "quantity": 412.69, "rate": 105.0, "amount": 43332.45}, {"description": "12mm x 1500 x 1250 - 1 Nos (SA 515 Grade 70)", "quantity": 176.44, "rate": 105.0, "amount": 18526.20}], "subtotal": 107297.61, "gst_amount": 19313.57, "grand_total": 126611.18, "missing_fields": [], "terms": {"loading": "Included", "transport": "Included", "payment": "Included"}}

WEIGHT CALCULATION FORMULA: Weight (kg) = (Thickness × Width × Length × 7.85 × Nos) / 1,000,000
- For steel plates: Use thickness (mm) × width (mm) × length (mm) × density (7.85) × quantity ÷ 1,000,000
- Example: 10x1250x6300 - 4 Nos = (10 × 1250 × 6300 × 7.85 × 4) ÷ 1,000,000 = 393.75 kg

IMPORTANT: 
- Return ONLY valid JSON. No explanations or additional text.
- Do NOT include "terms" field unless loading/transport/payment are explicitly mentioned in input.
- Only set terms values if user specifically mentions them (e.g., "loading included", "transport extra", "advance payment").
- For steel plates with dimensions, calculate weight using the formula above.
- Parse multiple items from complex inputs and create separate line items.
"""

    def _get_client(self):
        """Lazy load OpenAI client with proper error handling."""
        if self.client is None:
            # ✅ Get API key from environment
            openai_api_key = os.getenv("OPENAI_API_KEY")
            
            if not openai_api_key:
                raise ValueError("OPENAI_API_KEY is not set. Check your .env file!")
            
            if openai_api_key == "sk-your-openai-api-key-here":
                raise ValueError("Please replace the placeholder OPENAI_API_KEY in your .env file with your actual API key!")
            
            # ✅ Initialize OpenAI client with the API key
            self.client = OpenAI(api_key=openai_api_key)
            
        return self.client

    def extract_quote_fields(self, user_input: str, conversation_context: str = "") -> Dict:
        """
        ✅ PURE AI EXTRACTION - Replace all rule-based parsing with GPT-4
        """
        # Try pure AI extraction first
        ai_result = extract_quote_with_ai(user_input)
        if ai_result:
            # Add metadata
            ai_result.update({
                'success': True,
                'original_input': user_input,
                'extraction_method': 'pure_ai_gpt4',
                'timestamp': self._get_timestamp(),
                'confidence': 0.9
            })
            return ai_result
        
        # Fallback to basic structure if AI fails
        return {
            'success': False,
            'customer_name': None,
            'items': [],
            'subtotal': 0,
            'gst': 0,
            'grand_total': 0,
            'missing_fields': [],
            'confidence': 0.1,
            'extraction_method': 'ai_failed',
            'original_input': user_input
        }

    # ❌ REMOVED: _validate_and_enhance() and _fallback_extraction() - Pure AI handles all validation

    def detect_intent(self, user_input: str) -> str:
        """
        ✅ PURE AI INTENT DETECTION - Using GPT-4 for smarter intent understanding
        """
        # Use the pure AI parser to detect intent
        ai_result = extract_quote_with_ai(user_input)
        
        if ai_result and ai_result.get('customer_name'):
            return 'quotation'
        elif 'hello' in user_input.lower() or 'hi' in user_input.lower():
            return 'greeting'
        else:
            return 'general'

    def _get_timestamp(self) -> str:
        """Get current timestamp."""
        from datetime import datetime
        return datetime.now().isoformat()

# Global instances for easy import
quote_brain = QuoteBrain()
quote_draft_state = QuoteDraftState()

# Convenience functions for backward compatibility
def extract_quote_fields(user_input: str, context: str = "") -> Dict:
    """Main extraction function."""
    return quote_brain.extract_quote_fields(user_input, context)

def detect_intent(user_input: str) -> str:
    """Detect user intent."""
    return quote_brain.detect_intent(user_input)

def update_quote_draft(user_input: str, context: str = "") -> Dict:
    """
    Phase 2: Update quote draft state from user input
    Returns current state and next action
    """
    # Extract data from user input
    ai_data = extract_quote_fields(user_input, context)
    
    # Update the global state
    quote_draft_state.update_from_ai_extraction(ai_data)
    
    # Return current state and suggested next action
    return {
        'state': quote_draft_state.state,
        'summary': quote_draft_state.get_summary(),
        'missing_fields': quote_draft_state.get_missing_customer_fields(),
        'ready_for_pdf': quote_draft_state.is_ready_for_pdf(),
        'pdf_format': quote_draft_state.to_pdf_format() if quote_draft_state.is_ready_for_pdf() else None,
        'ai_data': ai_data
    } 