"""
Modern PDF Generator for AIBA
Creates beautiful, professional PDFs using HTML/CSS templates
"""

from jinja2 import Environment, FileSystemLoader
import weasyprint
import os
from datetime import datetime, timedelta
from typing import Dict, List

class ModernPDFGenerator:
    def __init__(self):
        # Setup Jinja2 environment
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates', 'pdf')
        os.makedirs(template_dir, exist_ok=True)
        self.env = Environment(loader=FileSystemLoader(template_dir))
        
        # Ensure data directory exists
        os.makedirs('data', exist_ok=True)
    
    def create_quotation_pdf(self, quote_data: Dict, user_profile: Dict = None) -> str:
        """Create a modern quotation PDF"""
        # Prepare data for template
        template_data = self._prepare_quotation_data(quote_data, user_profile)
        
        # Load and render template
        template = self.env.get_template('quotation.html')
        html_content = template.render(**template_data)
        
        # Generate filename
        filename = self._generate_quotation_filename(quote_data)
        filepath = os.path.join('data', filename)
        
        # Create PDF
        weasyprint.HTML(string=html_content).write_pdf(
            filepath,
            stylesheets=[weasyprint.CSS(string=self._get_print_css())]
        )
        
        return filename
    
    def create_po_pdf(self, po_data: Dict, user_profile: Dict = None) -> str:
        """Create a modern purchase order PDF"""
        # Prepare data for template
        template_data = self._prepare_po_data(po_data, user_profile)
        
        # Load and render template
        template = self.env.get_template('purchase_order.html')
        html_content = template.render(**template_data)
        
        # Generate filename
        filename = self._generate_po_filename(po_data)
        filepath = os.path.join('data', filename)
        
        # Create PDF
        weasyprint.HTML(string=html_content).write_pdf(
            filepath,
            stylesheets=[weasyprint.CSS(string=self._get_print_css())]
        )
        
        return filename
    
    def _prepare_quotation_data(self, quote_data: Dict, user_profile: Dict = None) -> Dict:
        """Prepare quotation data for template rendering"""
        business_info = self._get_business_info(user_profile)
        
        # Calculate totals
        items = quote_data.get('items', [])
        subtotal = sum(float(item.get('amount', 0)) for item in items)
        gst_rate = quote_data.get('gst_rate', 18)
        gst_amount = subtotal * (gst_rate / 100)
        total_amount = subtotal + gst_amount
        
        return {
            **business_info,
            **quote_data,
            'quote_number': f"AIBA-Q-{datetime.now().strftime('%Y%m%d%H%M')}",
            'date': datetime.now().strftime('%d %B %Y'),
            'validity_date': (datetime.now() + timedelta(days=30)).strftime('%d %B %Y'),
            'subtotal': f"{subtotal:,.2f}",
            'gst_amount': f"{gst_amount:,.2f}",
            'total_amount': f"{total_amount:,.2f}",
            'gst_rate': gst_rate,
            'current_year': datetime.now().year,
        }
    
    def _prepare_po_data(self, po_data: Dict, user_profile: Dict = None) -> Dict:
        """Prepare PO data for template rendering"""
        business_info = self._get_business_info(user_profile)
        
        return {
            **business_info,
            **po_data,
            'po_number': po_data.get('po_number', f"AIBA-PO-{datetime.now().strftime('%Y%m%d%H%M')}"),
            'date': datetime.now().strftime('%d %B %Y'),
            'current_year': datetime.now().year,
        }
    
    def _get_business_info(self, user_profile: Dict = None) -> Dict:
        """Get business information"""
        if user_profile:
            business_info = user_profile.get('business_info', {})
            bank_info = user_profile.get('bank_info', {})
            
            return {
                'company_name': business_info.get('business_name', 'AIBA Steel Solutions'),
                'address': business_info.get('address', 'Your Business Address'),
                'city': business_info.get('city', 'Your City'),
                'state': business_info.get('state', 'Your State'),
                'pincode': business_info.get('pincode', '000000'),
                'phone': business_info.get('phone', '+91-9876543210'),
                'email': business_info.get('email', 'info@aibasteelsolutions.com'),
                'website': business_info.get('website', 'www.aibasteelsolutions.com'),
                'gst_number': business_info.get('gstin', '12ABCDE1234F1Z5'),
                'bank_name': bank_info.get('bank_name', 'State Bank of India'),
                'account_number': bank_info.get('account_number', '1234567890'),
                'ifsc_code': bank_info.get('ifsc_code', 'SBIN0001234'),
                'branch': bank_info.get('branch', 'Main Branch'),
            }
        
        return {
            'company_name': 'AIBA Steel Solutions',
            'address': 'Industrial Area, Sector 7',
            'city': 'Faridabad',
            'state': 'Haryana',
            'pincode': '121006',
            'phone': '+91-9876543210',
            'email': 'info@aibasteelsolutions.com',
            'website': 'www.aibasteelsolutions.com',
            'gst_number': '12ABCDE1234F1Z5',
            'bank_name': 'State Bank of India',
            'account_number': '1234567890',
            'ifsc_code': 'SBIN0001234',
            'branch': 'Main Branch',
        }
    
    def _get_print_css(self) -> str:
        """Get additional CSS for print optimization"""
        return """
        @page {
            size: A4;
            margin: 0.5in;
        }
        
        body {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
        
        .page-break {
            page-break-before: always;
        }
        """
    
    def _generate_quotation_filename(self, quote_data: Dict) -> str:
        """Generate filename for quotation PDF"""
        date_str = datetime.now().strftime('%Y%m%d')
        customer = quote_data.get('customer_name', 'Customer').replace(' ', '_').replace('/', '_')
        return f"Quotation_{customer}_{date_str}.pdf"
    
    def _generate_po_filename(self, po_data: Dict) -> str:
        """Generate filename for PO PDF"""
        date_str = datetime.now().strftime('%Y%m%d')
        po_number = po_data.get('po_number', f'PO_{date_str}').replace('/', '_')
        return f"PurchaseOrder_{po_number}_{date_str}.pdf" 