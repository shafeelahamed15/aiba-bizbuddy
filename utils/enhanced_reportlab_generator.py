"""
Enhanced ReportLab PDF Generator for AIBA
Modern styling with ReportLab for Windows compatibility
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.graphics import renderPDF
from datetime import datetime, timedelta
import os
from typing import Dict, List

class EnhancedReportLabGenerator:
    def __init__(self):
        self.page_width, self.page_height = A4
        self.margin = 20*mm
        self.styles = getSampleStyleSheet()
        
        # Enhanced custom styles with modern colors
        self.company_name_style = ParagraphStyle(
            'CompanyName',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2c5282'),
            spaceAfter=8,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        self.header_style = ParagraphStyle(
            'ModernHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2d3748'),
            spaceAfter=12,
            fontName='Helvetica-Bold'
        )
        
        self.document_title_style = ParagraphStyle(
            'DocumentTitle',
            parent=self.styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#2d3748'),
            spaceAfter=10,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold'
        )
        
        self.normal_style = ParagraphStyle(
            'ModernNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#4a5568'),
            spaceAfter=6,
            fontName='Helvetica'
        )
        
        self.meta_style = ParagraphStyle(
            'MetaStyle',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#4a5568'),
            alignment=TA_RIGHT,
            fontName='Helvetica'
        )
        
        self.customer_name_style = ParagraphStyle(
            'CustomerName',
            parent=self.styles['Normal'],
            fontSize=16,
            textColor=colors.HexColor('#1a202c'),
            fontName='Helvetica-Bold',
            spaceAfter=8
        )
    
    def generate_quotation_pdf(
        self,
        seller: dict,
        buyer: dict,
        bank: dict,
        items: list,
        terms: dict = None,
        output_filename: str = None
    ) -> str:
        """Generate professional quotation PDF with modern styling"""
        
        if not output_filename:
            date_str = datetime.now().strftime('%Y%m%d')
            customer_name = buyer['name'].replace(' ', '_').replace('/', '_')
            output_filename = f"Quotation_{customer_name}_{date_str}.pdf"
        
        output_path = os.path.join('data', output_filename)
        
        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        # Build content with proforma invoice format
        story = []
        
        # Proforma invoice header
        story.append(Paragraph("<b>PROFORMA INVOICE</b>", 
                              ParagraphStyle('ProformaTitle',
                                           parent=self.document_title_style,
                                           fontSize=18,
                                           alignment=TA_CENTER,
                                           spaceAfter=30)))
        
        # From section
        story.append(Paragraph("<b>From:</b>", self.header_style))
        from_text = f"{seller['name']}<br/>{seller['address']}<br/>GSTIN: {seller['gstin']}<br/>Email: {seller['email']}"
        story.append(Paragraph(from_text, self.normal_style))
        story.append(Spacer(1, 15))
        
        # To section
        story.append(Paragraph("<b>To:</b>", self.header_style))
        to_text = f"{buyer['name']}<br/>{buyer['address']}<br/>GSTIN: {buyer['gstin']}<br/>Email: {buyer['email']}"
        story.append(Paragraph(to_text, self.normal_style))
        story.append(Spacer(1, 20))
        
        # Items table with integrated totals
        story.extend(self._build_modern_items_table(items))
        
        # Terms and conditions
        story.append(Spacer(1, 20))
        story.append(Paragraph("<b>Terms & Conditions:</b>", self.header_style))
        terms_text = "- Loading Charges: Included<br/>- Transport Charges: Included<br/>- Payment: Included"
        story.append(Paragraph(terms_text, self.normal_style))
        
        # Bank details
        story.append(Spacer(1, 15))
        story.append(Paragraph("<b>Bank Details:</b>", self.header_style))
        bank_text = f"Account Name: {bank['account_name']}<br/>Account Number: {bank['account_number']}<br/>IFSC Code: {bank['ifsc']}<br/>Branch: {bank['branch']}"
        story.append(Paragraph(bank_text, self.normal_style))
        
        # Generate PDF
        doc.build(story)
        
        return output_filename
    
    def generate_purchase_order_pdf(
        self,
        seller: dict,
        supplier: dict,
        items: list,
        po_number: str = None,
        reference: str = None,
        output_filename: str = None
    ) -> str:
        """Generate professional purchase order PDF"""
        
        if not output_filename:
            date_str = datetime.now().strftime('%Y%m%d')
            po_num = po_number or f"AIBA-PO-{datetime.now().strftime('%Y%m%d%H%M')}"
            output_filename = f"PurchaseOrder_{po_num.replace('/', '_')}_{date_str}.pdf"
        
        output_path = os.path.join('data', output_filename)
        
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        story = []
        
        # Header (green theme for PO)
        story.extend(self._build_modern_header(seller, color_theme='green'))
        story.append(Spacer(1, 20))
        
        # PO document header
        story.extend(self._build_po_document_header(po_number, reference))
        story.append(Spacer(1, 15))
        
        # Supplier section
        story.extend(self._build_supplier_section(supplier))
        story.append(Spacer(1, 20))
        
        # Items table for PO
        story.extend(self._build_po_items_table(items))
        story.append(Spacer(1, 20))
        
        # PO terms
        story.extend(self._build_po_terms_section())
        story.append(Spacer(1, 15))
        
        # Signature footer
        story.extend(self._build_signature_footer(seller))
        
        doc.build(story)
        
        return output_filename
    
    def _build_modern_header(self, seller: dict, color_theme: str = 'blue') -> List:
        """Build modern header with colored background effect"""
        elements = []
        
        # Company name with enhanced styling
        company_name = Paragraph(seller['name'], self.company_name_style)
        elements.append(company_name)
        
        # Tagline
        tagline = Paragraph("Professional Steel Solutions & Engineering Services", 
                          ParagraphStyle('Tagline', 
                                       parent=self.normal_style,
                                       fontSize=12,
                                       textColor=colors.HexColor('#718096'),
                                       alignment=TA_CENTER,
                                       spaceAfter=15))
        elements.append(tagline)
        
        # Contact information in two columns
        contact_data = [
            [f"📍 {seller['address']}", f"✉️ {seller['email']}"],
            [f"🏛️ GST: {seller['gstin']}", "🌐 www.aibasteelsolutions.com"]
        ]
        
        contact_table = Table(contact_data, colWidths=[3.5*inch, 3.5*inch])
        contact_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#4a5568')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        elements.append(contact_table)
        
        # Decorative line
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=2, 
                                 color=colors.HexColor('#2c5282' if color_theme == 'blue' else '#48bb78')))
        
        return elements
    
    def _build_document_header(self, terms: dict = None) -> List:
        """Build document header with quote details"""
        elements = []
        
        quote_number = f"AIBA-Q-{datetime.now().strftime('%Y%m%d%H%M')}"
        date_str = datetime.now().strftime('%d %B %Y')
        validity_date = (datetime.now() + timedelta(days=30)).strftime('%d %B %Y')
        
        # Title and meta in a table
        header_data = [
            [
                Paragraph("STEEL QUOTATION", self.document_title_style),
                Paragraph(f"<b>Quote #:</b> {quote_number}<br/>"
                         f"<b>Date:</b> {date_str}<br/>"
                         f"<b>Valid Until:</b> {validity_date}", self.meta_style)
            ]
        ]
        
        header_table = Table(header_data, colWidths=[4*inch, 3*inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        elements.append(header_table)
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
        
        return elements
    
    def _build_customer_section(self, buyer: dict) -> List:
        """Build customer section with card-like styling"""
        elements = []
        
        # Customer section with background color simulation
        customer_data = [
            [Paragraph("Quotation Prepared For:", 
                      ParagraphStyle('CustomerTitle', 
                                   parent=self.normal_style,
                                   fontSize=12,
                                   textColor=colors.HexColor('#4a5568'),
                                   fontName='Helvetica-Bold'))],
            [Paragraph(buyer['name'], self.customer_name_style)],
            [Paragraph(buyer['address'], self.normal_style)],
            [Paragraph(f"Email: {buyer['email']} | GST: {buyer['gstin']}", self.normal_style)]
        ]
        
        customer_table = Table(customer_data, colWidths=[7*inch])
        customer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f7fafc')),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ]))
        
        elements.append(customer_table)
        
        return elements
    
    def _build_modern_items_table(self, items: list) -> List:
        """Build items table with clean proforma invoice styling"""
        elements = []
        
        # Table headers matching proforma invoice format
        headers = ['S.No', 'Material Description (with Nos)', 'Qty (Kgs)', 'Rate (Rs/Kg)', 'Amount (Rs)']
        table_data = [headers]
        
        subtotal = 0
        for i, item in enumerate(items, 1):
            # Calculate weight and amount
            if all(key in item for key in ['thk', 'w', 'l', 'nos']):
                weight = round((item['thk'] * item['w'] * item['l'] * 7.85 * item['nos']) / 1_000_000, 2)
                quantity_display = f"{weight:.2f}"
            else:
                weight = item.get('weight', item.get('quantity', 0))
                quantity_display = f"{weight:.2f}"
            
            rate = item.get('rate', 0)
            amount = round(float(weight) * float(rate), 2)
            subtotal += amount
            
            table_data.append([
                str(i),
                item.get('desc', item.get('description', '')),
                quantity_display,
                f"{rate:.2f}",
                f"{amount:,.2f}"
            ])
        
        # Add summary rows
        gst_rate = 18
        gst_amount = round(subtotal * (gst_rate / 100), 2)
        grand_total = round(subtotal + gst_amount, 2)
        
        table_data.extend([
            ['', '', '', 'Subtotal', f"{subtotal:,.2f}"],
            ['', '', '', f'GST @{gst_rate}%', f"{gst_amount:,.2f}"],
            ['', '', '', 'Grand Total', f"{grand_total:,.2f}"]
        ])
        
        # Create table with clean styling
        items_table = Table(table_data, colWidths=[0.6*inch, 2.8*inch, 1*inch, 1*inch, 1.3*inch])
        
        # Clean proforma invoice table styling
        items_table.setStyle(TableStyle([
            # Header row - light gray background
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -4), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -4), 9),
            ('ALIGN', (0, 1), (0, -4), 'CENTER'),  # S.No
            ('ALIGN', (1, 1), (1, -4), 'LEFT'),    # Description
            ('ALIGN', (2, 1), (-1, -4), 'RIGHT'),  # Qty, Rate, Amount
            
            # Summary rows styling
            ('FONTNAME', (0, -3), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -3), (-1, -1), 10),
            ('ALIGN', (3, -3), (-1, -1), 'RIGHT'),
            ('ALIGN', (4, -3), (-1, -1), 'RIGHT'),
            
            # Grid - black borders like the image
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(items_table)
        
        return elements
    
    def _build_totals_section(self, items: list, terms: dict = None) -> List:
        """Build totals section with modern styling"""
        elements = []
        
        # Calculate totals
        subtotal = 0
        for item in items:
            if all(key in item for key in ['thk', 'w', 'l', 'nos']):
                weight = round((item['thk'] * item['w'] * item['l'] * 7.85 * item['nos']) / 1_000_000, 2)
            else:
                weight = item.get('weight', item.get('quantity', 0))
            
            rate = item.get('rate', 0)
            amount = round(float(weight) * float(rate), 2)
            subtotal += amount
        
        gst_rate = terms.get('gst_rate', 18) if terms else 18
        gst_amount = round(subtotal * (gst_rate / 100), 2)
        grand_total = round(subtotal + gst_amount, 2)
        
        # Totals table
        totals_data = [
            ['Subtotal:', f"₹{subtotal:,.2f}"],
            [f'GST ({gst_rate}%):', f"₹{gst_amount:,.2f}"],
            ['Grand Total:', f"₹{grand_total:,.2f}"]
        ]
        
        totals_table = Table(totals_data, colWidths=[1.5*inch, 1.5*inch])
        totals_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -2), colors.HexColor('#f8fafc')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, -2), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -2), 12),
            ('FONTSIZE', (0, -1), (-1, -1), 14),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        # Right align the totals table
        totals_wrapper = Table([[totals_table]], colWidths=[7*inch])
        totals_wrapper.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(totals_wrapper)
        
        return elements
    
    def _build_terms_section(self, terms: dict = None) -> List:
        """Build terms and conditions section"""
        elements = []
        
        terms = terms or {}
        
        # Terms header
        elements.append(Paragraph("Terms & Conditions", self.header_style))
        
        # Terms content
        terms_list = [
                            f"• Loading Charges: {terms.get('loading', 'Included')}",
            f"• Transport Charges: {terms.get('transport', 'Included')}",
                            f"• Payment Terms: {terms.get('payment', 'Included')}",
            "• This quotation is valid for 30 days from the date of issue",
            "• All prices are subject to GST as applicable",
            "• Material quality as per IS specifications"
        ]
        
        terms_text = '<br/>'.join(terms_list)
        terms_para = Paragraph(terms_text, 
                              ParagraphStyle('Terms',
                                           parent=self.normal_style,
                                           fontSize=10,
                                           leftIndent=10,
                                           bulletIndent=5))
        
        # Terms in a box
        terms_table = Table([[terms_para]], colWidths=[7*inch])
        terms_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fff4')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#38a169')),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ]))
        
        elements.append(terms_table)
        
        return elements
    
    def _build_footer_section(self, seller: dict, bank: dict) -> List:
        """Build footer with bank details and signature"""
        elements = []
        
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
        elements.append(Spacer(1, 15))
        
        # Bank details and signature
        bank_details = f"""<b>Bank Details for Payment:</b><br/>
Account Name: {bank['account_name']}<br/>
Account Number: {bank['account_number']}<br/>
IFSC Code: {bank['ifsc']}<br/>
Branch: {bank['branch']}"""
        
        signature_section = """<br/><br/><br/>
_______________________<br/>
<b>Authorized Signatory</b><br/>
<i>""" + seller['name'] + """</i>"""
        
        footer_data = [
            [Paragraph(bank_details, self.normal_style),
             Paragraph(signature_section, 
                      ParagraphStyle('Signature',
                                   parent=self.normal_style,
                                   alignment=TA_CENTER))]
        ]
        
        footer_table = Table(footer_data, colWidths=[4*inch, 3*inch])
        footer_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        elements.append(footer_table)
        
        return elements
    
    def _build_po_document_header(self, po_number: str = None, reference: str = None) -> List:
        """Build PO document header"""
        elements = []
        
        po_num = po_number or f"AIBA-PO-{datetime.now().strftime('%Y%m%d%H%M')}"
        date_str = datetime.now().strftime('%d %B %Y')
        
        header_text = f"<b>PO #:</b> {po_num}<br/><b>Date:</b> {date_str}"
        if reference:
            header_text += f"<br/><b>Reference:</b> {reference}"
        
        header_data = [
            [
                Paragraph("PURCHASE ORDER", self.document_title_style),
                Paragraph(header_text, self.meta_style)
            ]
        ]
        
        header_table = Table(header_data, colWidths=[4*inch, 3*inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(header_table)
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
        
        return elements
    
    def _build_supplier_section(self, supplier: dict) -> List:
        """Build supplier section"""
        elements = []
        
        supplier_data = [
            [Paragraph("Purchase Order To:", 
                      ParagraphStyle('SupplierTitle', 
                                   parent=self.normal_style,
                                   fontSize=12,
                                   textColor=colors.HexColor('#4a5568'),
                                   fontName='Helvetica-Bold'))],
            [Paragraph(supplier['name'], self.customer_name_style)],
            [Paragraph(supplier.get('address', ''), self.normal_style)]
        ]
        
        supplier_table = Table(supplier_data, colWidths=[7*inch])
        supplier_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fff4')),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#48bb78')),
        ]))
        
        elements.append(supplier_table)
        
        return elements
    
    def _build_po_items_table(self, items: list) -> List:
        """Build PO items table"""
        elements = []
        
        elements.append(Paragraph("Items & Specifications", self.header_style))
        
        headers = ['S.No', 'Description', 'Quantity', 'Unit', 'Remarks']
        table_data = [headers]
        
        if not items:
            table_data.append(['1', 'Items as per quotation/specification', 'As required', 'Various', 'As per agreed terms'])
        else:
            for i, item in enumerate(items, 1):
                table_data.append([
                    str(i),
                    item.get('description', item.get('desc', 'Item')),
                    str(item.get('quantity', 'TBD')),
                    item.get('unit', 'nos'),
                    item.get('remarks', 'As per specification')
                ])
        
        po_table = Table(table_data, colWidths=[0.5*inch, 3*inch, 1*inch, 0.8*inch, 1.7*inch])
        po_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#48bb78')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # Data
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (-1, -1), 'LEFT'),
            
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        elements.append(po_table)
        
        return elements
    
    def _build_po_terms_section(self) -> List:
        """Build PO terms section"""
        elements = []
        
        elements.append(Paragraph("Terms & Conditions", self.header_style))
        
        terms_list = [
            "• Supply items as per specification and delivery schedule",
            "• Quality of materials should meet industry standards",
            "• Payment will be made as per agreed terms",
            "• Any damage during transport is supplier's responsibility",
            "• Delivery location: As specified in the order",
            "• All applicable taxes and duties to be borne by supplier"
        ]
        
        terms_text = '<br/>'.join(terms_list)
        terms_para = Paragraph(terms_text, 
                              ParagraphStyle('POTerms',
                                           parent=self.normal_style,
                                           fontSize=10,
                                           leftIndent=10))
        
        terms_table = Table([[terms_para]], colWidths=[7*inch])
        terms_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fff4')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#38a169')),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ]))
        
        elements.append(terms_table)
        
        return elements
    
    def _build_signature_footer(self, seller: dict) -> List:
        """Build signature footer for PO"""
        elements = []
        
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
        elements.append(Spacer(1, 30))
        
        signature = f"""<br/><br/><br/>
_______________________<br/>
<b>Authorized Signatory</b><br/>
<i>{seller['name']}</i>"""
        
        signature_table = Table([[Paragraph(signature, 
                                           ParagraphStyle('POSignature',
                                                        parent=self.normal_style,
                                                        alignment=TA_CENTER))]], 
                               colWidths=[7*inch])
        signature_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ]))
        
        elements.append(signature_table)
        
        return elements 