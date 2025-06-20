"""
Enhanced Prompt Parser for AIBA
Handles natural language understanding and field extraction with support for steel industry terms.
"""

import re
from typing import Dict, Optional, List, Tuple

class PromptParser:
    def __init__(self):
        # Keywords for intent detection
        self.quotation_keywords = [
            'quote', 'quotation', 'estimate', 'pricing', 'cost', 
            'price list', 'quote for', 'quotation for', 'need quote',
            'create quote', 'make quote', 'generate quote'
        ]
        
        self.po_keywords = [
            'purchase order', 'po', 'order', 'buy', 'purchase',
            'procurement', 'po for', 'order for', 'po to',
            'purchase from', 'create po', 'make po'
        ]
        
        # Steel section weight table (kg per meter)
        self.steel_weights = {
            # ISMC (Indian Standard Medium Channel)
            'ismc 75': 7.14, 'ismc 100': 9.56, 'ismc 125': 13.1, 'ismc 150': 16.4,
            'ismc 175': 20.7, 'ismc 200': 25.1, 'ismc 225': 30.6, 'ismc 250': 36.3,
            'ismc 300': 46.1, 'ismc 350': 57.1, 'ismc 400': 69.2,
            
            # ISMB (Indian Standard Medium Beam)
            'ismb 100': 11.5, 'ismb 125': 13.7, 'ismb 150': 17.9, 'ismb 175': 22.8,
            'ismb 200': 25.4, 'ismb 225': 29.9, 'ismb 250': 37.3, 'ismb 300': 46.1,
            'ismb 350': 52.4, 'ismb 400': 61.6, 'ismb 450': 72.4, 'ismb 500': 86.9,
            
            # Angles
            'angle 25x25x3': 1.11, 'angle 30x30x3': 1.36, 'angle 40x40x3': 1.85,
            'angle 50x50x5': 3.77, 'angle 65x65x6': 5.90, 'angle 75x75x6': 6.85,
            'angle 90x90x8': 11.0, 'angle 100x100x10': 15.1,
            
            # Plates (per sq meter for 1mm thickness)
            'plate': 7.85,  # Base weight for 1mm thick plate per sq meter
            
            # Rounds
            'round 8': 0.395, 'round 10': 0.617, 'round 12': 0.888, 'round 16': 1.58,
            'round 20': 2.47, 'round 25': 3.85, 'round 32': 6.31, 'round 40': 9.87,
        }
        
    # ❌ REMOVED: interpret_incomplete_quote() - Replaced with pure AI parsing

    # ❌ REMOVED: detect_intent() - Replaced with pure AI intent detection
        
    def extract_quotation_data(self, user_input: str) -> Optional[Dict]:
        """
        Extract quotation details from user input using advanced patterns.
        First try incomplete quote interpretation, then fall back to detailed parsing.
        """
        
        # Try incomplete quote interpretation first
        incomplete_quote = self.interpret_incomplete_quote(user_input)
        if incomplete_quote:
            return incomplete_quote
        
        # Fall back to detailed parsing
        data = {}
        
        # Extract customer name patterns
        customer_name = self._extract_customer_name(user_input)
        if customer_name:
            data['customer_name'] = customer_name
            
        # Extract items/products with advanced parsing
        items = self._extract_items(user_input)
        if items:
            data['items'] = items
            
        # Extract GST
        gst_rate = self._extract_gst(user_input)
        if gst_rate:
            data['gst_rate'] = gst_rate
            
        # Extract transport/delivery terms
        transport = self._extract_transport_terms(user_input)
        if transport:
            data['transport'] = transport
            
        # Extract payment terms
        payment_terms = self._extract_payment_terms(user_input)
        if payment_terms:
            data['payment_terms'] = payment_terms
            
        return data if data else None
        
    def extract_po_data(self, user_input: str) -> Optional[Dict]:
        """
        Extract purchase order details from user input.
        """
        data = {}
        
        # Extract supplier/vendor
        supplier_name = self._extract_supplier_name(user_input)
        if supplier_name:
            data['supplier_name'] = supplier_name
            
        # Extract PO number
        po_number = self._extract_po_number(user_input)
        if po_number:
            data['po_number'] = po_number
            
        # Extract reference
        reference = self._extract_reference(user_input)
        if reference:
            data['reference'] = reference
            
        # Extract items for PO
        items = self._extract_items(user_input)
        if items:
            data['items'] = items
            
        return data if data else None
        
    def parse_items_from_text(self, text: str) -> List[Dict]:
        """
        Parse items from a text description.
        """
        return self._extract_items(text)
        
    def extract_additional_terms(self, text: str) -> Dict:
        """
        Extract additional terms like GST, transport, payment from text.
        """
        data = {}
        
        gst = self._extract_gst(text)
        if gst:
            data['gst_rate'] = gst
            
        transport = self._extract_transport_terms(text)
        if transport:
            data['transport'] = transport
            
        payment = self._extract_payment_terms(text)
        if payment:
            data['payment_terms'] = payment
            
        return data
        
    def _extract_customer_name(self, text: str) -> Optional[str]:
        """Extract customer name from text."""
        patterns = [
            r'(?:quote|quotation)?\s*(?:for|to)\s+([A-Za-z\s&./-]+?)(?:\s*[-–,]|\s+for|\s*$)',
            r'customer[:\s]+([A-Za-z\s&./-]+?)(?:\s*[-–,]|\s*$)',
            r'client[:\s]+([A-Za-z\s&./-]+?)(?:\s*[-–,]|\s*$)',
            r'(?:m/s|M/S)\s+([A-Za-z\s&./-]+?)(?:\s*[-–,]|\s*$)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Clean up the name
                name = re.sub(r'\s+', ' ', name)  # Remove extra spaces
                if len(name) > 2 and not re.match(r'^\d+$', name):  # Not just numbers
                    return name
                    
        return None
        
    def _extract_supplier_name(self, text: str) -> Optional[str]:
        """Extract supplier name from text."""
        patterns = [
            r'(?:po|order)?\s*(?:from|to)\s+([A-Za-z\s&./-]+?)(?:\s*[-–,]|\s+for|\s*$)',
            r'supplier[:\s]+([A-Za-z\s&./-]+?)(?:\s*[-–,]|\s*$)',
            r'vendor[:\s]+([A-Za-z\s&./-]+?)(?:\s*[-–,]|\s*$)',
            r'(?:m/s|M/S)\s+([A-Za-z\s&./-]+?)(?:\s*[-–,]|\s*$)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                name = re.sub(r'\s+', ' ', name)
                if len(name) > 2 and not re.match(r'^\d+$', name):
                    return name
                    
        return None
        
    def _extract_items(self, text: str) -> List[Dict]:
        """
        Extract items with quantities, rates, and units from text.
        Supports complex steel industry formats with MT to KG conversion.
        """
        items = []
        
        # Enhanced patterns for better steel industry parsing
        patterns = [
            # Pattern 1: [Description] - [Qty] [Unit] at/@ [Rate]
            r'([A-Za-z\s\d×x/.-]+?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(MT|KG|TON|TONNE|kg|nos|pcs|units?|meters?|mtrs?)\s*(?:at|@)\s*₹?(\d+(?:,\d+)*(?:\.\d+)?)\s*/?(\w+)?',
            
            # Pattern 2: [Qty] [Unit] [Description] at/@ [Rate]
            r'(\d+(?:\.\d+)?)\s*(MT|KG|TON|TONNE|kg|nos|pcs|units?|meters?|mtrs?)\s+([A-Za-z\s\d×x/.-]+?)\s*(?:at|@)\s*₹?(\d+(?:,\d+)*(?:\.\d+)?)\s*/?(\w+)?',
            
            # Pattern 3: [Description] [Qty] [Unit] [Rate]
            r'([A-Za-z\s\d×x/.-]+?)\s+(\d+(?:\.\d+)?)\s*(MT|KG|TON|TONNE|kg|nos|pcs|units?|meters?|mtrs?)\s+₹?(\d+(?:,\d+)*(?:\.\d+)?)\s*/?(\w+)?',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                groups = match.groups()
                
                if len(groups) >= 4:
                    if pattern == patterns[1]:  # Pattern 2: qty first
                        qty, unit, desc, rate = groups[0], groups[1], groups[2], groups[3]
                        rate_unit = groups[4] if len(groups) > 4 and groups[4] else 'kg'
                    else:  # Pattern 1 and 3: description first
                        desc, qty, unit, rate = groups[0], groups[1], groups[2], groups[3]
                        rate_unit = groups[4] if len(groups) > 4 and groups[4] else 'kg'
                    
                    # Clean and format the data
                    description = self._clean_description(desc)
                    qty_value = float(qty)
                    unit_normalized = self._normalize_unit(unit)
                    rate = float(rate.replace(',', ''))
                    
                    # ✅ Fix for MT to KG conversion
                    if unit_normalized.upper() in ['MT', 'TON', 'TONNE']:
                        qty_in_kg = qty_value * 1000
                        original_qty_display = f"{qty_value} {unit_normalized.upper()}"
                        # Update description to include original quantity
                        description = f"{description} ({original_qty_display})"
                    elif unit_normalized.upper() == 'KG':
                        qty_in_kg = qty_value
                    else:
                        qty_in_kg = qty_value  # For nos, pcs, etc.
                    
                    # Calculate amount
                    amount = qty_in_kg * rate
                    
                    item = {
                        'description': description,
                        'quantity': qty_in_kg,
                        'rate': rate,
                        'amount': amount,
                        'original_quantity': qty_value,
                        'original_unit': unit_normalized
                    }
                        
                    items.append(item)
        
        # If no complex patterns found, try simple patterns
        if not items:
            items = self._extract_simple_items(text)
            
        return items
        
    def _extract_simple_items(self, text: str) -> List[Dict]:
        """Extract items using simpler patterns."""
        items = []
        
        # Simple patterns for basic item extraction
        simple_patterns = [
            r'for\s+([^₹\n@]+?)(?:\s*[-–]\s*(\d+(?:\.\d+)?)\s*(MT|kg|nos|pcs|units?)|(?:\s*at\s*₹|\s*@))',
            r'items?[:\s]+([^₹\n@]+?)(?:\s*[-–]\s*(\d+(?:\.\d+)?)\s*(MT|kg|nos|pcs|units?)|(?:\s*at\s*₹|\s*@))',
        ]
        
        for pattern in simple_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                desc = self._clean_description(match.group(1))
                qty = float(match.group(2)) if match.group(2) else 1.0
                unit = self._normalize_unit(match.group(3)) if match.group(3) else 'nos'
                
                items.append({
                    'description': desc,
                    'quantity': qty,
                    'unit': unit,
                    'rate': 0,
                    'rate_unit': unit
                })
                break
                
        return items
        
    def _clean_description(self, desc: str) -> str:
        """Clean and format item description."""
        if not desc:
            return ""
            
        # Remove extra whitespace
        desc = re.sub(r'\s+', ' ', desc.strip())
        
        # Standardize common steel terms
        desc = re.sub(r'\bms\b', 'MS', desc, flags=re.IGNORECASE)
        desc = re.sub(r'\bismc\b', 'ISMC', desc, flags=re.IGNORECASE)
        desc = re.sub(r'\bismb\b', 'ISMB', desc, flags=re.IGNORECASE)
        desc = re.sub(r'\bangle\b', 'Angle', desc, flags=re.IGNORECASE)
        desc = re.sub(r'\bchannel\b', 'Channel', desc, flags=re.IGNORECASE)
        desc = re.sub(r'\bflat\b', 'Flat', desc, flags=re.IGNORECASE)
        desc = re.sub(r'\bplate\b', 'Plate', desc, flags=re.IGNORECASE)
        
        # Standardize dimensions
        desc = re.sub(r'(\d+)\s*[×x]\s*(\d+)', r'\1x\2', desc)
        desc = re.sub(r'(\d+)\s*mm', r'\1mm', desc)
        
        return desc
        
    def _normalize_unit(self, unit: str) -> str:
        """Normalize unit names with MT/KG support."""
        if not unit:
            return 'KG'
            
        unit = unit.lower().strip()
        
        # Metric tons
        if unit in ['mt', 'ton', 'tonne', 'tons', 'tonnes']:
            return 'MT'
        
        # Kilograms
        if unit in ['kg', 'kgs', 'kilogram', 'kilograms']:
            return 'KG'
            
        # Numbers/pieces
        if unit in ['nos', 'no', 'pcs', 'pc', 'pieces', 'piece', 'units', 'unit']:
            return 'Nos'
            
        # Length
        if unit in ['m', 'meter', 'meters', 'mtr', 'mtrs']:
            return 'Mtr'
            
        return unit.upper()
            
    def _calculate_weight(self, description: str, quantity: float, unit: str) -> Optional[float]:
        """Calculate weight in kg for steel items."""
        desc_lower = description.lower()
        
        # If unit is already weight-based, return as is
        if unit in ['kg', 'MT']:
            return quantity * 1000 if unit == 'MT' else quantity
            
        # For nos or meters, calculate based on steel weights
        for steel_type, weight_per_meter in self.steel_weights.items():
            if steel_type in desc_lower:
                if unit == 'nos':
                    # Assume standard length of 6 meters for sections
                    return quantity * weight_per_meter * 6
                elif unit == 'meters':
                    return quantity * weight_per_meter
                    
        # For plates, extract thickness and calculate
        if 'plate' in desc_lower:
            thickness_match = re.search(r'(\d+)\s*mm', desc_lower)
            if thickness_match:
                thickness_mm = float(thickness_match.group(1))
                # Assume 1 sq meter area if not specified
                area_sqm = 1.0
                return area_sqm * thickness_mm * 7.85 / 1000  # kg per sq meter per mm
                
        return None
        
    def _extract_gst(self, text: str) -> Optional[int]:
        """Extract GST rate from text."""
        patterns = [
            r'(?:gst|tax):\s*(\d+)%',
            r'(\d+)%\s*(?:gst|tax)',
            r'including\s*(\d+)%\s*gst',
            r'plus\s*(\d+)%\s*gst',
            r'gst\s*@\s*(\d+)%',
            r'gst\s*extra|gst\s*additional',  # Default to 18% if "extra" mentioned
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if match.groups():
                    return int(match.group(1))
                else:
                    return 18  # Default GST rate for "extra" mentions
                    
        return None
        
    def _extract_transport_terms(self, text: str) -> Optional[str]:
        """Extract transport/delivery terms."""
        patterns = [
            r'transport[:\s]+([^.\n,]+)',
            r'freight[:\s]+([^.\n,]+)',
            r'delivery[:\s]+([^.\n,]+)',
            r'(transport\s+(?:included|extra|additional|free))',
            r'(freight\s+(?:included|extra|additional|free))',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
                
        return None
        
    def _extract_payment_terms(self, text: str) -> Optional[str]:
        """Extract payment terms."""
        patterns = [
            r'payment[:\s]+([^.\n,]+)',
            r'(\d+\s*days?\s*payment)',
            r'(advance\s+payment)',
            r'(cash\s+on\s+delivery)',
            r'(cod)',
            r'(net\s+\d+\s*days?)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
                
        return None
        
    def _extract_po_number(self, text: str) -> Optional[str]:
        """Extract PO number."""
        patterns = [
            r'po\s*(?:no|number|#)[:\s]*([A-Za-z0-9/-]+)',
            r'purchase\s*order\s*(?:no|number|#)[:\s]*([A-Za-z0-9/-]+)',
            r'po[:\s]*([A-Za-z0-9/-]+)',
            r'po#([A-Za-z0-9/-]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
                
        return None
        
    def _extract_reference(self, text: str) -> Optional[str]:
        """Extract reference number or description."""
        patterns = [
            r'ref[:\s]*([A-Za-z0-9/-]+)',
            r'reference[:\s]*([A-Za-z0-9/-]+)',
            r'ref#([A-Za-z0-9/-]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
                
        return None
        
    def validate_quotation_data(self, data: Dict) -> List[str]:
        """Validate quotation data and return missing required fields."""
        required_fields = ['customer_name', 'items']
        missing = []
        
        for field in required_fields:
            if field not in data or not data[field]:
                missing.append(field)
                
        if 'items' in data and data['items']:
            for i, item in enumerate(data['items']):
                if 'description' not in item or not item['description']:
                    missing.append(f'item_{i+1}_description')
                if 'quantity' not in item or not item['quantity']:
                    missing.append(f'item_{i+1}_quantity')
                    
        return missing
        
    def validate_po_data(self, data: Dict) -> List[str]:
        """Validate purchase order data and return missing required fields."""
        required_fields = ['supplier_name', 'po_number']
        missing = []
        
        for field in required_fields:
            if field not in data or not data[field]:
                missing.append(field)
                
        return missing 