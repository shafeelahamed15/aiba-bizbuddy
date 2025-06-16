"""
PDF Generator Module for AIBA
Creates professional PDF documents for quotations and purchase orders.
"""

from fpdf import FPDF
from datetime import datetime
import os
from typing import Dict, List

class PDFGenerator:
    def __init__(self):
        self.margin = 20
        self.line_height = 6
        
    def create_quotation_pdf(self, quote_data: Dict, business_info: Dict = None) -> str:
        """
        Create a professional quotation PDF.
        
        Args:
            quote_data: Dictionary containing quotation details
            business_info: Dictionary containing business/company details
            
        Returns:
            Path to the generated PDF file
        """
        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        # Use default business info if not provided
        if not business_info:
            business_info = self._get_default_business_info()
            
        # Header
        self._add_quotation_header(pdf, business_info)
        
        # Customer details
        self._add_customer_section(pdf, quote_data)
        
        # Items table
        self._add_items_table(pdf, quote_data.get('items', []))
        
        # Totals
        self._add_quotation_totals(pdf, quote_data)
        
        # Terms and conditions
        self._add_terms_and_conditions(pdf, quote_data)
        
        # Save PDF
        filename = self._generate_quotation_filename(quote_data)
        filepath = os.path.join('data', filename)
        pdf.output(filepath)
        
        return filepath
        
    def create_po_pdf(self, po_data: Dict, business_info: Dict = None) -> str:
        """
        Create a professional purchase order PDF.
        
        Args:
            po_data: Dictionary containing PO details
            business_info: Dictionary containing business/company details
            
        Returns:
            Path to the generated PDF file
        """
        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        # Use default business info if not provided
        if not business_info:
            business_info = self._get_default_business_info()
            
        # Header
        self._add_po_header(pdf, business_info)
        
        # PO details
        self._add_po_details(pdf, po_data)
        
        # Supplier details
        self._add_supplier_section(pdf, po_data)
        
        # Items table
        self._add_po_items_table(pdf, po_data.get('items', []))
        
        # Save PDF
        filename = self._generate_po_filename(po_data)
        filepath = os.path.join('data', filename)
        pdf.output(filepath)
        
        return filepath
        
    def _add_quotation_header(self, pdf: FPDF, business_info: Dict):
        """Add quotation header with company details."""
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(0, 10, business_info.get('company_name', 'Your Company Name'), 0, 1, 'C')
        
        pdf.set_font('Arial', '', 10)
        pdf.cell(0, 5, business_info.get('address', 'Company Address'), 0, 1, 'C')
        pdf.cell(0, 5, f"Phone: {business_info.get('phone', 'N/A')} | Email: {business_info.get('email', 'N/A')}", 0, 1, 'C')
        
        pdf.ln(10)
        
        # Quotation title
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'QUOTATION', 0, 1, 'C')
        
        # Date and quotation number
        pdf.set_font('Arial', '', 10)
        date_str = datetime.now().strftime('%d-%m-%Y')
        quote_no = f"Q{datetime.now().strftime('%Y%m%d%H%M')}"
        
        pdf.cell(95, 6, f'Date: {date_str}', 0, 0)
        pdf.cell(95, 6, f'Quotation No: {quote_no}', 0, 1, 'R')
        pdf.ln(5)
        
    def _add_customer_section(self, pdf: FPDF, quote_data: Dict):
        """Add customer details section."""
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 8, 'Bill To:', 0, 1)
        
        pdf.set_font('Arial', '', 10)
        customer_name = quote_data.get('customer_name', 'Customer Name')
        pdf.cell(0, 6, customer_name, 0, 1)
        
        if quote_data.get('customer_address'):
            pdf.cell(0, 6, quote_data['customer_address'], 0, 1)
            
        pdf.ln(5)
        
    def _add_items_table(self, pdf: FPDF, items: List[Dict]):
        """Add items table to quotation."""
        # Table header
        pdf.set_font('Arial', 'B', 10)
        pdf.cell(10, 8, 'Sr.', 1, 0, 'C')
        pdf.cell(70, 8, 'Description', 1, 0, 'C')
        pdf.cell(20, 8, 'Qty', 1, 0, 'C')
        pdf.cell(20, 8, 'Unit', 1, 0, 'C')
        pdf.cell(30, 8, 'Rate', 1, 0, 'C')
        pdf.cell(30, 8, 'Amount', 1, 1, 'C')
        
        # Table rows
        pdf.set_font('Arial', '', 9)
        total_amount = 0
        
        for i, item in enumerate(items, 1):
            description = item.get('description', 'Item')
            quantity = item.get('quantity', 1)
            unit = item.get('unit', 'nos')
            rate = item.get('rate', 0)
            amount = quantity * rate
            total_amount += amount
            
            pdf.cell(10, 8, str(i), 1, 0, 'C')
            pdf.cell(70, 8, description[:35], 1, 0, 'L')  # Truncate long descriptions
            pdf.cell(20, 8, str(quantity), 1, 0, 'R')
            pdf.cell(20, 8, unit, 1, 0, 'C')
            pdf.cell(30, 8, f'₹{rate:,.2f}', 1, 0, 'R')
            pdf.cell(30, 8, f'₹{amount:,.2f}', 1, 1, 'R')
            
        return total_amount
        
    def _add_quotation_totals(self, pdf: FPDF, quote_data: Dict):
        """Add totals section to quotation."""
        items = quote_data.get('items', [])
        subtotal = sum(item.get('quantity', 1) * item.get('rate', 0) for item in items)
        
        gst_rate = quote_data.get('gst_rate', 18)
        gst_amount = subtotal * (gst_rate / 100)
        total = subtotal + gst_amount
        
        pdf.ln(5)
        
        # Subtotal
        pdf.set_font('Arial', 'B', 10)
        pdf.cell(150, 6, 'Subtotal:', 0, 0, 'R')
        pdf.cell(30, 6, f'₹{subtotal:,.2f}', 0, 1, 'R')
        
        # GST
        pdf.cell(150, 6, f'GST ({gst_rate}%):', 0, 0, 'R')
        pdf.cell(30, 6, f'₹{gst_amount:,.2f}', 0, 1, 'R')
        
        # Total
        pdf.set_font('Arial', 'B', 12)
        pdf.cell(150, 8, 'Total Amount:', 0, 0, 'R')
        pdf.cell(30, 8, f'₹{total:,.2f}', 0, 1, 'R')
        
    def _add_terms_and_conditions(self, pdf: FPDF, quote_data: Dict):
        """Add terms and conditions to quotation."""
        pdf.ln(10)
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 8, 'Terms & Conditions:', 0, 1)
        
        pdf.set_font('Arial', '', 9)
        
        terms = [
            "1. Prices are valid for 30 days from the date of quotation.",
            "2. Payment terms: Advance payment required before delivery.",
            "3. Delivery timeline will be confirmed upon order confirmation.",
        ]
        
        if quote_data.get('transport'):
            terms.append(f"4. Transport: {quote_data['transport']}")
            
        if quote_data.get('delivery_terms'):
            terms.append(f"5. Delivery: {quote_data['delivery_terms']}")
            
        for term in terms:
            pdf.cell(0, 5, term, 0, 1)
            
    def _add_po_header(self, pdf: FPDF, business_info: Dict):
        """Add purchase order header."""
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(0, 10, business_info.get('company_name', 'Your Company Name'), 0, 1, 'C')
        
        pdf.set_font('Arial', '', 10)
        pdf.cell(0, 5, business_info.get('address', 'Company Address'), 0, 1, 'C')
        
        pdf.ln(10)
        
        # PO title
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'PURCHASE ORDER', 0, 1, 'C')
        
    def _add_po_details(self, pdf: FPDF, po_data: Dict):
        """Add PO details section."""
        pdf.set_font('Arial', '', 10)
        
        date_str = datetime.now().strftime('%d-%m-%Y')
        po_number = po_data.get('po_number', f"PO{datetime.now().strftime('%Y%m%d%H%M')}")
        
        pdf.cell(95, 6, f'PO Number: {po_number}', 0, 0)
        pdf.cell(95, 6, f'Date: {date_str}', 0, 1, 'R')
        
        if po_data.get('reference'):
            pdf.cell(95, 6, f'Reference: {po_data["reference"]}', 0, 1)
            
        pdf.ln(5)
        
    def _add_supplier_section(self, pdf: FPDF, po_data: Dict):
        """Add supplier details section."""
        pdf.set_font('Arial', 'B', 11)
        pdf.cell(0, 8, 'Supplier:', 0, 1)
        
        pdf.set_font('Arial', '', 10)
        supplier_name = po_data.get('supplier_name', 'Supplier Name')
        pdf.cell(0, 6, supplier_name, 0, 1)
        
        if po_data.get('supplier_address'):
            pdf.cell(0, 6, po_data['supplier_address'], 0, 1)
            
        pdf.ln(5)
        
    def _add_po_items_table(self, pdf: FPDF, items: List[Dict]):
        """Add items table to purchase order."""
        # Table header
        pdf.set_font('Arial', 'B', 10)
        pdf.cell(10, 8, 'Sr.', 1, 0, 'C')
        pdf.cell(100, 8, 'Description', 1, 0, 'C')
        pdf.cell(25, 8, 'Quantity', 1, 0, 'C')
        pdf.cell(25, 8, 'Unit', 1, 0, 'C')
        pdf.cell(20, 8, 'Rate', 1, 1, 'C')
        
        # Table rows
        pdf.set_font('Arial', '', 9)
        
        if not items:
            # Add placeholder row if no items
            pdf.cell(10, 8, '1', 1, 0, 'C')
            pdf.cell(100, 8, 'Items as per quotation', 1, 0, 'L')
            pdf.cell(25, 8, 'As required', 1, 0, 'C')
            pdf.cell(25, 8, 'Various', 1, 0, 'C')
            pdf.cell(20, 8, 'As quoted', 1, 1, 'C')
        else:
            for i, item in enumerate(items, 1):
                description = item.get('description', 'Item')
                quantity = item.get('quantity', 'TBD')
                unit = item.get('unit', 'nos')
                rate = item.get('rate', 'TBD')
                
                pdf.cell(10, 8, str(i), 1, 0, 'C')
                pdf.cell(100, 8, description[:50], 1, 0, 'L')
                pdf.cell(25, 8, str(quantity), 1, 0, 'R')
                pdf.cell(25, 8, unit, 1, 0, 'C')
                pdf.cell(20, 8, str(rate), 1, 1, 'R')
                
    def _generate_quotation_filename(self, quote_data: Dict) -> str:
        """Generate filename for quotation PDF."""
        date_str = datetime.now().strftime('%Y%m%d')
        customer = quote_data.get('customer_name', 'Customer').replace(' ', '_')
        return f"Quotation_{customer}_{date_str}.pdf"
        
    def _generate_po_filename(self, po_data: Dict) -> str:
        """Generate filename for PO PDF."""
        date_str = datetime.now().strftime('%Y%m%d')
        po_number = po_data.get('po_number', f'PO_{date_str}')
        return f"PurchaseOrder_{po_number}_{date_str}.pdf"
        
    def _get_default_business_info(self) -> Dict:
        """Get default business information."""
        return {
            'company_name': 'Your Business Name',
            'address': 'Your Business Address, City, State, PIN',
            'phone': '+91-XXXXXXXXXX',
            'email': 'business@example.com',
            'gst_number': 'GST_NUMBER',
        } 