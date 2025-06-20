"""
Template-based PDF Generator for AIBA Steel Industry System
Supports both WeasyPrint (preferred) and ReportLab (Windows fallback)
Uses Jinja2 HTML templates for professional document generation
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from jinja2 import Environment, FileSystemLoader, select_autoescape

class TemplatePDFGenerator:
    """Professional template-based PDF generator with WeasyPrint and ReportLab fallback"""
    
    def __init__(self, template_dir: str = "templates/pdf"):
        """
        Initialize the template-based PDF generator
        
        Args:
            template_dir: Directory containing Jinja2 templates
        """
        self.template_dir = template_dir
        self.template_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )
        
        # Try to import WeasyPrint
        self.weasyprint_available = False
        self.weasyprint_HTML = None
        self.weasyprint_CSS = None
        
        try:
            # Import WeasyPrint only when needed, not at module level
            import weasyprint
            self.weasyprint_HTML = weasyprint.HTML
            self.weasyprint_CSS = weasyprint.CSS
            self.weasyprint_available = True
            print("✅ WeasyPrint available - Using HTML templates")
        except (ImportError, OSError) as e:
            print(f"⚠️ WeasyPrint not available: {e}")
            print("📋 Falling back to ReportLab for template rendering")
    
    def _prepare_steel_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare and structure data for template rendering
        
        Args:
            data: Raw data from AIBA system
            
        Returns:
            Dict: Structured data for template rendering
        """
        template_data = {
            'seller': {
                'name': data.get('seller_name', 'IGNITE INDUSTRIAL CORPORATION'),
                'address': data.get('seller_address', 'No.1A, 1st FLOOR, JONES STREET, MANNADY, CHENNAI - 600001'),
                'email': data.get('seller_email', 'igniteindustrialcorporation@gmail.com'),
                'gstin': data.get('seller_gstin', '33AAKFI5034N1Z6')
            },
            'buyer': {
                'name': data.get('customer_name', 'Customer Name'),
                'address': data.get('customer_address', 'Customer Address'),
                'email': data.get('customer_email', 'customer@email.com'),
                'gstin': data.get('customer_gstin', 'Customer GST Number')
            },
            'items': [],
            'summary': {
                'subtotal': 0.0,
                'gst_rate': 18,
                'gst': 0.0,
                'grand_total': 0.0
            },
            'terms': {
                'loading': data.get('loading_charges', 'Included'),
                'transport': data.get('transport_charges', 'Included'),
                'payment': data.get('payment_terms', 'Included')
            },
            'bank': {
                'account_name': 'IGNITE INDUSTRIAL CORPORATION',
                'account_number': '194101300000000018',
                'ifsc': 'KVBL0001941',
                'branch': 'KVB Bank, BEEMANAGAR TRICHY'
            }
        }
        
        # Process items
        total_weight = 0.0
        subtotal = 0.0
        
        for item in data.get('items', []):
            # Extract description and calculate weight
            description = item.get('description', 'Steel Item')
            qty = float(item.get('quantity', 0))
            rate = float(item.get('rate', 0))
            amount = qty * rate
            
            template_data['items'].append({
                'description': description,
                'qty': qty,
                'rate': rate,
                'amount': amount
            })
            
            total_weight += qty
            subtotal += amount
        
        # Calculate GST and totals
        gst_amount = subtotal * 0.18
        grand_total = subtotal + gst_amount
        
        template_data['summary'].update({
            'subtotal': subtotal,
            'gst': gst_amount,
            'grand_total': grand_total
        })
        
        return template_data
    
    def _generate_with_weasyprint(self, template_name: str, data: Dict[str, Any]) -> bytes:
        """
        Generate PDF using WeasyPrint and HTML template
        
        Args:
            template_name: Name of the template file
            data: Template data
            
        Returns:
            bytes: PDF content
        """
        try:
            template = self.template_env.get_template(template_name)
            html_content = template.render(**data)
            
            # Generate PDF with WeasyPrint
            pdf_bytes = self.weasyprint_HTML(string=html_content).write_pdf()
            return pdf_bytes
            
        except Exception as e:
            print(f"❌ WeasyPrint generation failed: {e}")
            raise
    
    def _generate_with_reportlab_fallback(self, doc_type: str, data: Dict[str, Any]) -> bytes:
        """
        Generate PDF using ReportLab as fallback when WeasyPrint fails
        
        Args:
            doc_type: Type of document ('quotation' or 'purchase_order')
            data: Template data
            
        Returns:
            bytes: PDF content
        """
        try:
            from utils.simple_steel_generator import SimpleSteelPDFGenerator
            
            # Prepare data in the format expected by SimpleSteelPDFGenerator
            seller = data['seller']
            buyer = data['buyer']
            bank = data['bank']
            
            # Convert items to the format expected by ReportLab generator
            # ReportLab expects 'desc' field, but template data has 'description'
            converted_items = []
            for item in data['items']:
                converted_item = {
                    'desc': item['description'],  # Convert 'description' to 'desc'
                    'quantity': item['qty'],      # Convert 'qty' to 'quantity'
                    'rate': item['rate'],
                    'weight': item['qty'],        # Use qty as weight for steel items
                    'unit': 'kg'
                }
                converted_items.append(converted_item)
            
            # ✨ Terms & Conditions Logic (Corrected) - Use "Included" as default
            terms = {
                'loading': data.get('terms', {}).get('loading', 'Included'),
                'transport': data.get('terms', {}).get('transport', 'Included'),
                'payment': data.get('terms', {}).get('payment', 'Included')
            }
            
            # Generate filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{doc_type}_{buyer['name'].replace(' ', '_')}_{timestamp}.pdf"
            
            # Generate with ReportLab
            generator = SimpleSteelPDFGenerator()
            if doc_type == 'quotation':
                pdf_path = generator.generate_quotation_pdf(
                    seller=seller,
                    buyer=buyer,
                    bank=bank,
                    items=converted_items,
                    terms=terms,
                    output_filename=filename
                )
            else:
                # For purchase orders, swap seller and buyer (supplier)
                pdf_path = generator.generate_purchase_order_pdf(
                    seller=buyer,  # In PO, buyer becomes the seller
                    supplier=seller,  # In PO, seller becomes the supplier
                    items=converted_items,
                    po_number=data.get('order', {}).get('po_number', f'PO-{timestamp}'),
                    reference=data.get('order', {}).get('quote_number', ''),
                    output_filename=filename
                )
            
            # Read the generated PDF file and return as bytes
            # The generator returns just the filename, so we need to construct the full path
            full_pdf_path = os.path.join('data', pdf_path) if not os.path.isabs(pdf_path) else pdf_path
            
            with open(full_pdf_path, 'rb') as f:
                pdf_bytes = f.read()
            
            return pdf_bytes
                
        except Exception as e:
            print(f"❌ ReportLab fallback failed: {e}")
            raise
    
    def generate_quotation_pdf(self, data: Dict[str, Any]) -> bytes:
        """
        Generate a professional quotation PDF
        
        Args:
            data: Quotation data from AIBA system
            
        Returns:
            bytes: PDF content
        """
        try:
            # Prepare template data
            template_data = self._prepare_steel_data(data)
            
            # Add quotation-specific data
            template_data['invoice'] = {
                'quote_number': data.get('quote_number', f"AIBA-Q-{datetime.now().strftime('%Y%m%d%H%M')}"),
                'date': data.get('date', datetime.now().strftime('%d %B %Y')),
                'valid_until': data.get('valid_until', datetime.now().strftime('%d %B %Y'))
            }
            
            # Try WeasyPrint first
            if self.weasyprint_available:
                try:
                    return self._generate_with_weasyprint('quotation_template.html', template_data)
                except Exception as e:
                    print(f"⚠️ WeasyPrint failed, using ReportLab fallback: {e}")
            
            # Use ReportLab fallback
            return self._generate_with_reportlab_fallback('quotation', template_data)
            
        except Exception as e:
            print(f"❌ Quotation generation failed: {e}")
            raise
    
    def generate_purchase_order_pdf(self, data: Dict[str, Any]) -> bytes:
        """
        Generate a professional purchase order PDF
        
        Args:
            data: Purchase order data from AIBA system
            
        Returns:
            bytes: PDF content
        """
        try:
            # Prepare template data
            template_data = self._prepare_steel_data(data)
            
            # Add purchase order-specific data
            template_data['order'] = {
                'po_number': data.get('po_number', f"AIBA-PO-{datetime.now().strftime('%Y%m%d%H%M')}"),
                'date': data.get('date', datetime.now().strftime('%d %B %Y')),
                'delivery_date': data.get('delivery_date', datetime.now().strftime('%d %B %Y')),
                'urgent': data.get('urgent', False)
            }
            
            template_data['delivery'] = {
                'address': data.get('delivery_address', template_data['buyer']['address']),
                'contact_person': data.get('delivery_contact', 'Site Manager'),
                'phone': data.get('delivery_phone', '+91-XXXXXXXXX'),
                'instructions': data.get('delivery_instructions', 'Please call before delivery')
            }
            
            # Try WeasyPrint first
            if self.weasyprint_available:
                try:
                    return self._generate_with_weasyprint('purchase_order_template.html', template_data)
                except Exception as e:
                    print(f"⚠️ WeasyPrint failed, using ReportLab fallback: {e}")
            
            # Use ReportLab fallback
            return self._generate_with_reportlab_fallback('purchase_order', template_data)
            
        except Exception as e:
            print(f"❌ Purchase order generation failed: {e}")
            raise
    
    def test_template_generation(self) -> bool:
        """
        Test template generation with sample data
        
        Returns:
            bool: True if test successful
        """
        try:
            # Sample test data
            test_data = {
                'customer_name': 'ABC Engineering Company',
                'customer_address': 'Test Address, City - 123456',
                'customer_email': 'test@company.com',
                'customer_gstin': '33AABCD1234E1Z5',
                'items': [
                    {
                        'description': 'Steel Plate 12mm x 2500mm x 6000mm - 2 Nos',
                        'quantity': 235.5,
                        'rate': 84.0
                    },
                    {
                        'description': 'ISMB 150 - 45 Nos',
                        'quantity': 337.5,
                        'rate': 82.0
                    }
                ]
            }
            
            print("🧪 Testing template PDF generation...")
            
            # Test quotation
            quotation_pdf = self.generate_quotation_pdf(test_data)
            print(f"✅ Quotation PDF generated: {len(quotation_pdf)} bytes")
            
            # Test purchase order
            po_pdf = self.generate_purchase_order_pdf(test_data)
            print(f"✅ Purchase Order PDF generated: {len(po_pdf)} bytes")
            
            return True
            
        except Exception as e:
            print(f"❌ Template test failed: {e}")
            return False

def main():
    """Test the template PDF generator"""
    generator = TemplatePDFGenerator()
    
    # Test the generator
    if generator.test_template_generation():
        print("\n🎉 Template PDF Generator is working correctly!")
        print(f"📁 Templates directory: {generator.template_dir}")
        print(f"⚙️ WeasyPrint available: {generator.weasyprint_available}")
    else:
        print("\n❌ Template PDF Generator test failed!")

if __name__ == "__main__":
    main() 