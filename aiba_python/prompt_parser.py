"""
Prompt Parser Module for AIBA
Handles natural language understanding and field extraction from user input.
"""

import re
from typing import Dict, Optional, List

class PromptParser:
    def __init__(self):
        # Keywords for intent detection
        self.quotation_keywords = [
            'quote', 'quotation', 'estimate', 'pricing', 'cost', 
            'price list', 'quote for', 'quotation for'
        ]
        
        self.po_keywords = [
            'purchase order', 'po', 'order', 'buy', 'purchase',
            'procurement', 'po for', 'order for'
        ]
        
    def detect_intent(self, user_input: str) -> str:
        """
        Detect if user wants to create a quotation, purchase order, or general query.
        
        Args:
            user_input: The user's message
            
        Returns:
            'quotation', 'purchase_order', or 'general'
        """
        user_input_lower = user_input.lower()
        
        # Check for quotation keywords
        for keyword in self.quotation_keywords:
            if keyword in user_input_lower:
                return 'quotation'
                
        # Check for purchase order keywords
        for keyword in self.po_keywords:
            if keyword in user_input_lower:
                return 'purchase_order'
                
        return 'general'
        
    def extract_quotation_data(self, user_input: str) -> Optional[Dict]:
        """
        Extract quotation details from user input using patterns.
        
        Args:
            user_input: The user's message
            
        Returns:
            Dictionary with extracted quotation data or None
        """
        data = {}
        
        # Extract customer name patterns
        customer_patterns = [
            r'(?:quote|quotation)?\s*(?:for|to)\s+([A-Za-z\s&]+?)(?:\s+for|\s+--|$)',
            r'customer[:\s]+([A-Za-z\s&]+?)(?:\s+for|\s+--|$)',
            r'client[:\s]+([A-Za-z\s&]+?)(?:\s+for|\s+--|$)',
        ]
        
        for pattern in customer_patterns:
            match = re.search(pattern, user_input, re.IGNORECASE)
            if match:
                data['customer_name'] = match.group(1).strip()
                break
                
        # Extract items/products
        item_patterns = [
            r'for\s+([^₹\n]+?)(?:\s*[-–]\s*\d+|\s*at\s*₹|\s*@)',
            r'items?[:\s]+([^₹\n]+?)(?:\s*[-–]\s*\d+|\s*at\s*₹|\s*@)',
            r'products?[:\s]+([^₹\n]+?)(?:\s*[-–]\s*\d+|\s*at\s*₹|\s*@)',
        ]
        
        for pattern in item_patterns:
            match = re.search(pattern, user_input, re.IGNORECASE)
            if match:
                item_desc = match.group(1).strip()
                data['items'] = [{'description': item_desc, 'quantity': 1, 'unit': 'nos'}]
                break
                
        # Extract quantities
        qty_patterns = [
            r'[-–]\s*(\d+(?:\.\d+)?)\s*(MT|kg|nos|pcs|units?)',
            r'(\d+(?:\.\d+)?)\s*(MT|kg|nos|pcs|units?)',
        ]
        
        for pattern in qty_patterns:
            match = re.search(pattern, user_input, re.IGNORECASE)
            if match and 'items' in data:
                data['items'][0]['quantity'] = float(match.group(1))
                data['items'][0]['unit'] = match.group(2)
                break
                
        # Extract prices
        price_patterns = [
            r'at\s*₹(\d+(?:,\d+)*(?:\.\d+)?)/(\w+)',
            r'@\s*₹(\d+(?:,\d+)*(?:\.\d+)?)/(\w+)',
            r'₹(\d+(?:,\d+)*(?:\.\d+)?)/(\w+)',
        ]
        
        for pattern in price_patterns:
            match = re.search(pattern, user_input, re.IGNORECASE)
            if match and 'items' in data:
                price_str = match.group(1).replace(',', '')
                data['items'][0]['rate'] = float(price_str)
                data['items'][0]['unit'] = match.group(2)
                break
                
        # Extract GST
        gst_patterns = [
            r'(?:gst|tax):\s*(\d+)%',
            r'(\d+)%\s*(?:gst|tax)',
            r'including\s*(\d+)%\s*gst',
        ]
        
        for pattern in gst_patterns:
            match = re.search(pattern, user_input, re.IGNORECASE)
            if match:
                data['gst_rate'] = int(match.group(1))
                break
                
        # Extract transport
        transport_patterns = [
            r'transport[:\s]+([^.\n]+)',
            r'freight[:\s]+([^.\n]+)',
            r'delivery[:\s]+([^.\n]+)',
        ]
        
        for pattern in transport_patterns:
            match = re.search(pattern, user_input, re.IGNORECASE)
            if match:
                data['transport'] = match.group(1).strip()
                break
                
        return data if data else None
        
    def extract_po_data(self, user_input: str) -> Optional[Dict]:
        """
        Extract purchase order details from user input.
        
        Args:
            user_input: The user's message
            
        Returns:
            Dictionary with extracted PO data or None
        """
        data = {}
        
        # Extract supplier/vendor
        supplier_patterns = [
            r'(?:po|order)?\s*(?:from|to)\s+([A-Za-z\s&]+?)(?:\s+for|\s+--|$)',
            r'supplier[:\s]+([A-Za-z\s&]+?)(?:\s+for|\s+--|$)',
            r'vendor[:\s]+([A-Za-z\s&]+?)(?:\s+for|\s+--|$)',
        ]
        
        for pattern in supplier_patterns:
            match = re.search(pattern, user_input, re.IGNORECASE)
            if match:
                data['supplier_name'] = match.group(1).strip()
                break
                
        # Extract PO number
        po_patterns = [
            r'po\s*(?:no|number)[:\s]*([A-Za-z0-9/-]+)',
            r'purchase\s*order\s*(?:no|number)[:\s]*([A-Za-z0-9/-]+)',
            r'po[:\s]*([A-Za-z0-9/-]+)',
        ]
        
        for pattern in po_patterns:
            match = re.search(pattern, user_input, re.IGNORECASE)
            if match:
                data['po_number'] = match.group(1).strip()
                break
                
        # Extract reference
        ref_patterns = [
            r'ref[:\s]*([A-Za-z0-9/-]+)',
            r'reference[:\s]*([A-Za-z0-9/-]+)',
        ]
        
        for pattern in ref_patterns:
            match = re.search(pattern, user_input, re.IGNORECASE)
            if match:
                data['reference'] = match.group(1).strip()
                break
                
        return data if data else None
        
    def validate_quotation_data(self, data: Dict) -> List[str]:
        """
        Validate quotation data and return list of missing fields.
        
        Args:
            data: Quotation data dictionary
            
        Returns:
            List of missing required fields
        """
        required_fields = ['customer_name', 'items']
        missing = []
        
        for field in required_fields:
            if field not in data or not data[field]:
                missing.append(field)
                
        if 'items' in data:
            for i, item in enumerate(data['items']):
                if 'description' not in item or not item['description']:
                    missing.append(f'item_{i+1}_description')
                if 'quantity' not in item or not item['quantity']:
                    missing.append(f'item_{i+1}_quantity')
                    
        return missing
        
    def validate_po_data(self, data: Dict) -> List[str]:
        """
        Validate purchase order data and return list of missing fields.
        
        Args:
            data: PO data dictionary
            
        Returns:
            List of missing required fields
        """
        required_fields = ['supplier_name', 'po_number']
        missing = []
        
        for field in required_fields:
            if field not in data or not data[field]:
                missing.append(field)
                
        return missing 