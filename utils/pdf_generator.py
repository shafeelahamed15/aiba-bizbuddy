"""
Professional PDF Generator for AIBA
Creates high-quality PDF documents for quotations and purchase orders using reportlab.
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import os
from typing import Dict, List

class PDFGenerator:
    def __init__(self):
        self.page_width, self.page_height = A4
        self.margin = 0.75 * inch
        self.styles = getSampleStyleSheet()
        
        # Custom styles
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2c3e50')
        )
        
        self.header_style = ParagraphStyle(
            'CustomHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=10,
            textColor=colors.HexColor('#34495e')
        )
        
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6
        )
        
        self.small_style = ParagraphStyle(
            'CustomSmall',
            parent=self.styles['Normal'],
            fontSize=9,
            spaceAfter=4
        )
        
    def create_quotation_pdf(self, quote_data: Dict, user_profile: Dict = None) -> str:
        """Create a professional quotation PDF."""
        if not user_profile:
            business_info = self._get_default_business_info()
        else:
            business_info = self._format_business_info_from_profile(user_profile)
            
        filename = self._generate_quotation_filename(quote_data)
        filepath = os.path.join('data', filename)
        
        # Create PDF document
        doc = SimpleDocTemplate(
            filepath,
            pagesize=A4,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        # Build content
        story = []
        
        # Header
        story.extend(self._build_quotation_header(business_info))
        story.append(Spacer(1, 20))
        
        # Customer and quote details
        story.extend(self._build_quotation_details(quote_data))
        story.append(Spacer(1, 15))
        
        # Items table
        story.extend(self._build_items_table(quote_data.get('items', [])))
        story.append(Spacer(1, 10))
        
        # Totals
        story.extend(self._build_quotation_totals(quote_data))
        story.append(Spacer(1, 20))
        
        # Terms and conditions
        story.extend(self._build_terms_conditions(quote_data))
        
        # Footer
        story.extend(self._build_footer(business_info))
        
        # Generate PDF
        doc.build(story)
        
        return filename
        
    def create_po_pdf(self, po_data: Dict, user_profile: Dict = None) -> str:
        """Create a professional purchase order PDF."""
        if not user_profile:
            business_info = self._get_default_business_info()
        else:
            business_info = self._format_business_info_from_profile(user_profile)
            
        filename = self._generate_po_filename(po_data)
        filepath = os.path.join('data', filename)
        
        # Create PDF document
        doc = SimpleDocTemplate(
            filepath,
            pagesize=A4,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        # Build content
        story = []
        
        # Header
        story.extend(self._build_po_header(business_info))
        story.append(Spacer(1, 20))
        
        # PO details
        story.extend(self._build_po_details(po_data))
        story.append(Spacer(1, 15))
        
        # Supplier details
        story.extend(self._build_supplier_details(po_data))
        story.append(Spacer(1, 15))
        
        # Items table
        story.extend(self._build_po_items_table(po_data.get('items', [])))
        story.append(Spacer(1, 20))
        
        # PO terms
        story.extend(self._build_po_terms(po_data))
        
        # Footer
        story.extend(self._build_footer(business_info))
        
        # Generate PDF
        doc.build(story)
        
        return filename
        
    def _build_quotation_header(self, business_info: Dict) -> List:
        """Build quotation header section."""
        elements = []
        
        # Company name
        company_name = Paragraph(
            business_info.get('company_name', 'Your Company Name'),
            self.title_style
        )
        elements.append(company_name)
        
        # Company details
        address_lines = [
            business_info.get('address', 'Company Address'),
            f"Phone: {business_info.get('phone', 'N/A')} | Email: {business_info.get('email', 'N/A')}"
        ]
        
        if business_info.get('gst_number'):
            address_lines.append(f"GST No: {business_info['gst_number']}")
            
        for line in address_lines:
            elements.append(Paragraph(line, self.normal_style))
            
        # Horizontal line
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
        
        return elements
        
    def _build_quotation_details(self, quote_data: Dict) -> List:
        """Build quotation details section."""
        elements = []
        
        # Quotation title
        title = Paragraph("QUOTATION", self.title_style)
        elements.append(title)
        
        # Create details table
        date_str = datetime.now().strftime('%d-%m-%Y')
        quote_no = f"Q{datetime.now().strftime('%Y%m%d%H%M')}"
        
        details_data = [
            ['Date:', date_str, 'Quotation No:', quote_no],
            ['Valid Until:', self._get_validity_date(), 'Customer:', quote_data.get('customer_name', 'N/A')]
        ]
        
        details_table = Table(details_data, colWidths=[1*inch, 1.5*inch, 1*inch, 2*inch])
        details_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),  # First column bold
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),  # Third column bold
        ]))
        
        elements.append(details_table)
        
        return elements
        
    def _build_items_table(self, items: List[Dict]) -> List:
        """Build items table for quotation."""
        elements = []
        
        if not items:
            elements.append(Paragraph("No items specified", self.normal_style))
            return elements
            
        # Table headers
        headers = ['Sr.', 'Description', 'Qty', 'Unit', 'Rate (₹)', 'Amount (₹)']
        table_data = [headers]
        
        total_amount = 0
        
        for i, item in enumerate(items, 1):
            description = item.get('description', 'Item')
            quantity = item.get('quantity', 1)
            unit = item.get('unit', 'nos')
            rate = item.get('rate', 0)
            
            # Calculate amount
            if unit == 'MT' and item.get('weight_kg'):
                # If rate is per kg but unit is MT, use weight
                if item.get('rate_unit') == 'kg':
                    amount = (item['weight_kg'] / 1000) * rate * 1000  # Convert to MT then back
                else:
                    amount = quantity * rate
            elif unit == 'kg' and item.get('weight_kg'):
                amount = item['weight_kg'] * rate
            else:
                amount = quantity * rate
                
            total_amount += amount
            
            # Format rate display
            rate_display = f"₹{rate:,.2f}"
            if item.get('rate_unit') and item['rate_unit'] != unit:
                rate_display += f"/{item['rate_unit']}"
                
            table_data.append([
                str(i),
                description,
                f"{quantity:g}",  # Remove trailing zeros
                unit,
                rate_display,
                f"₹{amount:,.2f}"
            ])
        
        # Create table
        table = Table(table_data, colWidths=[0.5*inch, 3*inch, 0.8*inch, 0.8*inch, 1.2*inch, 1.2*inch])
        
        # Table style
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Sr. No
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),  # Qty, Rate, Amount
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Description
            ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # Unit
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
        ]))
        
        elements.append(table)
        
        return elements
        
    def _build_quotation_totals(self, quote_data: Dict) -> List:
        """Build totals section."""
        elements = []
        
        items = quote_data.get('items', [])
        subtotal = 0
        
        # Calculate subtotal
        for item in items:
            quantity = item.get('quantity', 1)
            rate = item.get('rate', 0)
            unit = item.get('unit', 'nos')
            
            if unit == 'MT' and item.get('weight_kg'):
                if item.get('rate_unit') == 'kg':
                    amount = (item['weight_kg'] / 1000) * rate * 1000
                else:
                    amount = quantity * rate
            elif unit == 'kg' and item.get('weight_kg'):
                amount = item['weight_kg'] * rate
            else:
                amount = quantity * rate
                
            subtotal += amount
        
        # GST calculation
        gst_rate = quote_data.get('gst_rate', 18)
        gst_amount = subtotal * (gst_rate / 100)
        total = subtotal + gst_amount
        
        # Create totals table
        totals_data = [
            ['', '', '', 'Subtotal:', f'₹{subtotal:,.2f}'],
            ['', '', '', f'GST ({gst_rate}%):', f'₹{gst_amount:,.2f}'],
            ['', '', '', 'Total Amount:', f'₹{total:,.2f}']
        ]
        
        totals_table = Table(totals_data, colWidths=[0.5*inch, 3*inch, 0.8*inch, 1.5*inch, 1.2*inch])
        totals_table.setStyle(TableStyle([
            ('FONTNAME', (3, 0), (3, 1), 'Helvetica-Bold'),
            ('FONTNAME', (3, 2), (4, 2), 'Helvetica-Bold'),
            ('FONTSIZE', (3, 2), (4, 2), 12),
            ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
            ('LINEABOVE', (3, 2), (-1, 2), 2, colors.black),
            ('BACKGROUND', (3, 2), (-1, 2), colors.HexColor('#ecf0f1')),
        ]))
        
        elements.append(totals_table)
        
        return elements
        
    def _build_terms_conditions(self, quote_data: Dict) -> List:
        """Build terms and conditions section."""
        elements = []
        
        elements.append(Paragraph("Terms & Conditions:", self.header_style))
        
        terms = [
            "1. Prices are valid for 30 days from the date of quotation.",
            "2. Payment terms: Advance payment required before delivery.",
            "3. Delivery timeline will be confirmed upon order confirmation.",
            "4. All disputes subject to local jurisdiction."
        ]
        
        # Add custom terms from data
        if quote_data.get('transport'):
            terms.append(f"5. Transport: {quote_data['transport']}")
            
        if quote_data.get('payment_terms'):
            terms.append(f"6. Payment: {quote_data['payment_terms']}")
            
        for term in terms:
            elements.append(Paragraph(term, self.small_style))
            
        return elements
        
    def _build_po_header(self, business_info: Dict) -> List:
        """Build purchase order header."""
        elements = []
        
        # Company name
        company_name = Paragraph(
            business_info.get('company_name', 'Your Company Name'),
            self.title_style
        )
        elements.append(company_name)
        
        # Company details
        address_lines = [
            business_info.get('address', 'Company Address'),
            f"Phone: {business_info.get('phone', 'N/A')} | Email: {business_info.get('email', 'N/A')}"
        ]
        
        for line in address_lines:
            elements.append(Paragraph(line, self.normal_style))
            
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
        
        return elements
        
    def _build_po_details(self, po_data: Dict) -> List:
        """Build PO details section."""
        elements = []
        
        # PO title
        title = Paragraph("PURCHASE ORDER", self.title_style)
        elements.append(title)
        
        # PO details
        date_str = datetime.now().strftime('%d-%m-%Y')
        po_number = po_data.get('po_number', f"PO{datetime.now().strftime('%Y%m%d%H%M')}")
        
        details_data = [
            ['PO Number:', po_number, 'Date:', date_str],
        ]
        
        if po_data.get('reference'):
            details_data.append(['Reference:', po_data['reference'], '', ''])
            
        details_table = Table(details_data, colWidths=[1*inch, 2*inch, 1*inch, 2*inch])
        details_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(details_table)
        
        return elements
        
    def _build_supplier_details(self, po_data: Dict) -> List:
        """Build supplier details section."""
        elements = []
        
        elements.append(Paragraph("Supplier Details:", self.header_style))
        
        supplier_info = [
            f"Name: {po_data.get('supplier_name', 'N/A')}",
        ]
        
        if po_data.get('supplier_address'):
            supplier_info.append(f"Address: {po_data['supplier_address']}")
            
        for info in supplier_info:
            elements.append(Paragraph(info, self.normal_style))
            
        return elements
        
    def _build_po_items_table(self, items: List[Dict]) -> List:
        """Build items table for purchase order."""
        elements = []
        
        # Table headers
        headers = ['Sr.', 'Description', 'Quantity', 'Unit', 'Remarks']
        table_data = [headers]
        
        if not items:
            # Add placeholder row
            table_data.append([
                '1',
                'Items as per quotation/specification',
                'As required',
                'Various',
                'As per agreed terms'
            ])
        else:
            for i, item in enumerate(items, 1):
                table_data.append([
                    str(i),
                    item.get('description', 'Item'),
                    f"{item.get('quantity', 'TBD')}",
                    item.get('unit', 'nos'),
                    item.get('remarks', 'As specified')
                ])
        
        # Create table
        table = Table(table_data, colWidths=[0.5*inch, 3.5*inch, 1*inch, 0.8*inch, 1.7*inch])
        
        # Table style
        table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Sr. No
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),    # Description
            ('ALIGN', (2, 1), (3, -1), 'CENTER'),  # Qty, Unit
            ('ALIGN', (4, 1), (4, -1), 'LEFT'),    # Remarks
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
        ]))
        
        elements.append(table)
        
        return elements
        
    def _build_po_terms(self, po_data: Dict) -> List:
        """Build PO terms section."""
        elements = []
        
        elements.append(Paragraph("Terms & Conditions:", self.header_style))
        
        terms = [
            "1. Supply items as per specification and delivery schedule.",
            "2. Quality of materials should meet industry standards.",
            "3. Payment will be made as per agreed terms.",
            "4. Any damage during transport is supplier's responsibility."
        ]
        
        for term in terms:
            elements.append(Paragraph(term, self.small_style))
            
        return elements
        
    def _build_footer(self, business_info: Dict) -> List:
        """Build footer section."""
        elements = []
        
        elements.append(Spacer(1, 30))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
        elements.append(Spacer(1, 10))
        
        # Authorized signature
        signature_table = Table([
            ['', 'Authorized Signature'],
            ['', business_info.get('company_name', 'Company Name')]
        ], colWidths=[4*inch, 2*inch])
        
        signature_table.setStyle(TableStyle([
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (1, 0), (1, 1), 10),
            ('ALIGN', (1, 0), (1, 1), 'CENTER'),
            ('LINEABOVE', (1, 0), (1, 0), 1, colors.black),
        ]))
        
        elements.append(signature_table)
        
        return elements
        
    def _get_validity_date(self) -> str:
        """Get validity date (30 days from now)."""
        from datetime import timedelta
        validity_date = datetime.now() + timedelta(days=30)
        return validity_date.strftime('%d-%m-%Y')
        
    def _generate_quotation_filename(self, quote_data: Dict) -> str:
        """Generate filename for quotation PDF."""
        date_str = datetime.now().strftime('%Y%m%d')
        customer = quote_data.get('customer_name', 'Customer').replace(' ', '_').replace('/', '_')
        return f"Quotation_{customer}_{date_str}.pdf"
        
    def _generate_po_filename(self, po_data: Dict) -> str:
        """Generate filename for PO PDF."""
        date_str = datetime.now().strftime('%Y%m%d')
        po_number = po_data.get('po_number', f'PO_{date_str}').replace('/', '_')
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
    
    def _format_business_info_from_profile(self, user_profile: Dict) -> Dict:
        """Format business information from user profile."""
        business_info = user_profile.get('business_info', {})
        bank_info = user_profile.get('bank_info', {})
        
        return {
            'company_name': business_info.get('business_name', 'Your Business Name'),
            'address': business_info.get('address', 'Your Business Address'),
            'phone': business_info.get('phone', '+91-XXXXXXXXXX'),
            'email': business_info.get('email', 'business@example.com'),
            'gst_number': business_info.get('gstin', ''),
            'state': business_info.get('state', ''),
            'country': business_info.get('country', 'India'),
            'pincode': business_info.get('pincode', ''),
            'website': business_info.get('website', ''),
            # Bank information for payment details
            'bank_name': bank_info.get('bank_name', ''),
            'account_number': bank_info.get('account_number', ''),
            'account_name': bank_info.get('account_name', ''),
            'ifsc_code': bank_info.get('ifsc_code', ''),
            'branch': bank_info.get('branch', '')
        } 