"""
PDF Integration Functions for AIBA
Bridge between existing AIBA data format and new Steel PDF Generator
"""

from .simple_steel_generator import SimpleSteelPDFGenerator
from typing import Dict, List
import re

class AIBAPDFIntegration:
    def __init__(self):
        self.steel_generator = SimpleSteelPDFGenerator()
    
    def create_quotation_from_aiba_data(self, quote_data: Dict, user_profile: Dict = None) -> str:
        """
        Convert AIBA quotation data to steel PDF format and generate PDF
        
        Args:
            quote_data: AIBA format quotation data
            user_profile: User's business profile information
            
        Returns:
            str: Generated PDF filename
        """
        
        # Prepare seller info from user profile
        seller = self._prepare_seller_info(user_profile)
        
        # Prepare buyer info from quote data
        buyer = self._prepare_buyer_info(quote_data)
        
        # Prepare bank details
        bank = self._prepare_bank_info(user_profile)
        
        # Convert AIBA items to steel format
        items = self._convert_aiba_items_to_steel(quote_data.get('items', []))
        
        # Prepare terms
        terms = self._prepare_terms(quote_data)
        
        # Generate PDF
        return self.steel_generator.generate_quotation_pdf(
            seller=seller,
            buyer=buyer,
            bank=bank,
            items=items,
            terms=terms
        )
    
    def create_po_from_aiba_data(self, po_data: Dict, user_profile: Dict = None) -> str:
        """
        Convert AIBA PO data to steel PDF format and generate PDF
        
        Args:
            po_data: AIBA format PO data
            user_profile: User's business profile information
            
        Returns:
            str: Generated PDF filename
        """
        
        # Prepare seller info from user profile
        seller = self._prepare_seller_info(user_profile)
        
        # Prepare supplier info
        supplier = {
            'name': po_data.get('supplier_name', 'Supplier Name'),
            'address': po_data.get('supplier_address', '')
        }
        
        # Convert items
        items = []
        for item in po_data.get('items', []):
            items.append({
                'description': item.get('description', 'Item'),
                'quantity': item.get('quantity', 'TBD'),
                'unit': item.get('unit', 'nos'),
                'remarks': item.get('remarks', 'As per specification')
            })
        
        # Generate PDF
        return self.steel_generator.generate_purchase_order_pdf(
            seller=seller,
            supplier=supplier,
            items=items,
            po_number=po_data.get('po_number'),
            reference=po_data.get('reference')
        )
    
    def _prepare_seller_info(self, user_profile: Dict = None) -> Dict:
        """Prepare seller information from user profile"""
        if user_profile and user_profile.get('business_info'):
            business_info = user_profile['business_info']
            return {
                'name': business_info.get('business_name', 'AIBA Steel Solutions'),
                'address': f"{business_info.get('address', 'Industrial Area')}, {business_info.get('city', 'Faridabad')}, {business_info.get('state', 'Haryana')} - {business_info.get('pincode', '121006')}",
                'gstin': business_info.get('gstin', '12ABCDE1234F1Z5'),
                'email': business_info.get('email', 'info@aibasteelsolutions.com')
            }
        
        # Default company info
        return {
            'name': 'AIBA Steel Solutions',
            'address': 'Industrial Area, Sector 7, Faridabad, Haryana - 121006',
            'gstin': '12ABCDE1234F1Z5',
            'email': 'info@aibasteelsolutions.com'
        }
    
    def _prepare_buyer_info(self, quote_data: Dict) -> Dict:
        """Prepare buyer information from quote data"""
        return {
            'name': quote_data.get('customer_name', 'Customer'),
            'address': quote_data.get('customer_address', 'Customer Address'),
            'gstin': quote_data.get('customer_gst', 'Customer GST'),
            'email': quote_data.get('customer_email', 'customer@email.com')
        }
    
    def _prepare_bank_info(self, user_profile: Dict = None) -> Dict:
        """Prepare bank information from user profile"""
        if user_profile and user_profile.get('bank_info'):
            bank_info = user_profile['bank_info']
            return {
                'account_name': bank_info.get('account_name', 'AIBA Steel Solutions'),
                'account_number': bank_info.get('account_number', '1234567890'),
                'ifsc': bank_info.get('ifsc_code', 'SBIN0001234'),
                'branch': bank_info.get('branch', 'Main Branch')
            }
        
        # Default bank info
        return {
            'account_name': 'AIBA Steel Solutions',
            'account_number': '1234567890',
            'ifsc': 'SBIN0001234',
            'branch': 'State Bank of India - Main Branch'
        }
    
    def _convert_aiba_items_to_steel(self, aiba_items: List[Dict]) -> List[Dict]:
        """Convert AIBA items format to steel calculation format"""
        steel_items = []
        
        for item in aiba_items:
            steel_item = {
                'desc': item.get('description', 'Steel Item'),
                'rate': float(item.get('rate', 0))
            }
            
            # Try to detect steel plate/sheet dimensions from description
            dimensions = self._extract_steel_dimensions(item.get('description', ''))
            
            if dimensions:
                steel_item.update(dimensions)
            else:
                # Use weight directly if no dimensions found
                steel_item.update({
                    'weight': float(item.get('quantity', item.get('amount', 0)) / float(item.get('rate', 1)) if item.get('rate') and float(item.get('rate')) > 0 else item.get('quantity', 0)),
                    'unit': item.get('unit', 'kg')
                })
            
            steel_items.append(steel_item)
        
        return steel_items
    
    def _extract_steel_dimensions(self, description: str) -> Dict:
        """
        Extract steel dimensions from description text
        Examples:
        - "12mm x 1250mm x 2500mm - 2 Nos" 
        - "10mm x 2.5m x 6m - 4 pieces"
        - "ISMB 150 - 45 Nos" (will calculate based on standard weights)
        """
        
        # Pattern for plate/sheet dimensions (thickness x width x length)
        plate_pattern = r'(\d+(?:\.\d+)?)\s*mm\s*x\s*(\d+(?:\.\d+)?)\s*(?:mm|m)\s*x\s*(\d+(?:\.\d+)?)\s*(?:mm|m).*?(\d+)\s*(?:nos|pcs|pieces)'
        
        match = re.search(plate_pattern, description.lower())
        if match:
            thickness = float(match.group(1))
            width = float(match.group(2))
            length = float(match.group(3))
            nos = int(match.group(4))
            
            # Convert to mm if needed
            if 'm' in match.group(0) and 'mm' not in match.group(0):
                width = width * 1000 if width < 100 else width  # Assume meters if < 100
                length = length * 1000 if length < 100 else length
            
            return {
                'thk': thickness,
                'w': width,
                'l': length,
                'nos': nos
            }
        
        # Pattern for standard steel sections (ISMB, ISMC, etc.)
        section_pattern = r'(ismb|ismc|isa|rsj)\s*(\d+).*?(\d+)\s*(?:nos|pcs|pieces)'
        match = re.search(section_pattern, description.lower())
        if match:
            section_type = match.group(1)
            size = int(match.group(2))
            nos = int(match.group(3))
            
            # Standard length for sections (6 meters)
            length = 6000  # mm
            
            # Get standard weight per meter for the section
            weight_per_meter = self._get_standard_section_weight(section_type, size)
            
            if weight_per_meter:
                # Calculate equivalent plate dimensions for weight calculation
                # Using a simplified approach: treat as a plate with equivalent weight
                total_weight = weight_per_meter * (length / 1000) * nos
                return {
                    'weight': total_weight,
                    'unit': 'kg'
                }
        
        return None
    
    def _get_standard_section_weight(self, section_type: str, size: int) -> float:
        """Get standard weight per meter for steel sections"""
        
        # Standard weights (kg/m) for common steel sections
        weights = {
            'ismb': {
                100: 11.5, 150: 17.9, 200: 25.4, 250: 37.3, 
                300: 46.1, 350: 52.4, 400: 61.6, 450: 72.4, 500: 86.9
            },
            'ismc': {
                75: 7.14, 100: 9.56, 125: 13.1, 150: 16.4, 175: 20.7,
                200: 25.1, 225: 30.6, 250: 36.3, 300: 46.1, 350: 57.1, 400: 69.2
            },
            'isa': {
                25: 1.11, 30: 1.36, 40: 1.85, 50: 3.77, 65: 5.90,
                75: 6.85, 90: 11.0, 100: 15.1
            },
            'rsj': {
                100: 11.5, 150: 17.9, 200: 25.4, 250: 37.3, 300: 46.1
            }
        }
        
        return weights.get(section_type, {}).get(size, 0)
    
    def _prepare_terms(self, quote_data: Dict) -> Dict:
        """Prepare terms and conditions from quote data"""
        return {
            'gst_rate': quote_data.get('gst_rate', 18),
            'loading': quote_data.get('loading_charges', 'Included'),
            'transport': quote_data.get('transport', quote_data.get('transport_terms', 'Included')),
            'payment': quote_data.get('payment_terms', 'Included')
        } 