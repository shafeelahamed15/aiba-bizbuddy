"""
Enhanced Steel Industry PDF Generator for AIBA
Modular PDF generator with modern styling and steel calculations
Falls back to ReportLab on Windows if WeasyPrint unavailable
"""

from datetime import datetime, timedelta
import os
from typing import Dict, List

# WeasyPrint availability will be checked only when needed
WEASYPRINT_AVAILABLE = None

def _check_weasyprint_available():
    """Check if WeasyPrint is available without causing import errors"""
    try:
        import weasyprint
        return True
    except (ImportError, OSError):
        return False

class SteelPDFGenerator:
    def __init__(self):
        os.makedirs('data', exist_ok=True)
        
        # Check WeasyPrint availability only during initialization
        global WEASYPRINT_AVAILABLE
        if WEASYPRINT_AVAILABLE is None:
            WEASYPRINT_AVAILABLE = _check_weasyprint_available()
        
        self.use_weasyprint = WEASYPRINT_AVAILABLE
        if not self.use_weasyprint:
            from .enhanced_reportlab_generator import EnhancedReportLabGenerator
            self.reportlab_generator = EnhancedReportLabGenerator()
    
    def generate_quotation_pdf(
        self,
        seller: dict,
        buyer: dict,
        bank: dict,
        items: list,
        terms: dict = None,
        output_filename: str = None
    ) -> str:
        """
        Generate professional steel quotation PDF
        
        Args:
            seller: Company details
            buyer: Customer details  
            bank: Bank account details
            items: List of steel items with calculations
            terms: Additional terms and conditions
            output_filename: Custom filename (optional)
        
        Returns:
            str: Generated PDF filename
        """
        
        # Use ReportLab fallback if WeasyPrint is not available
        if not self.use_weasyprint:
            return self.reportlab_generator.generate_quotation_pdf(
                seller=seller,
                buyer=buyer,
                bank=bank,
                items=items,
                terms=terms,
                output_filename=output_filename
            )
        
        # Generate filename if not provided
        if not output_filename:
            date_str = datetime.now().strftime('%Y%m%d')
            customer_name = buyer['name'].replace(' ', '_').replace('/', '_')
            output_filename = f"Quotation_{customer_name}_{date_str}.pdf"
        
        output_path = os.path.join('data', output_filename)
        
        # Calculate totals and generate item rows
        rows_html, subtotal = self._generate_item_rows(items)
        
        # Calculate GST and total
        gst_rate = terms.get('gst_rate', 18) if terms else 18
        gst_amount = round(subtotal * (gst_rate / 100), 2)
        grand_total = round(subtotal + gst_amount, 2)
        
        # Generate quote number
        quote_number = f"AIBA-Q-{datetime.now().strftime('%Y%m%d%H%M')}"
        date_str = datetime.now().strftime('%d %B %Y')
        validity_date = (datetime.now() + timedelta(days=30)).strftime('%d %B %Y')
        
        # Create HTML content
        html_content = self._generate_html_template(
            seller=seller,
            buyer=buyer,
            bank=bank,
            items_html=rows_html,
            subtotal=subtotal,
            gst_rate=gst_rate,
            gst_amount=gst_amount,
            grand_total=grand_total,
            quote_number=quote_number,
            date_str=date_str,
            validity_date=validity_date,
            terms=terms or {}
        )
        
        # Generate PDF using WeasyPrint
        from weasyprint import HTML, CSS
        HTML(string=html_content).write_pdf(
            output_path,
            stylesheets=[CSS(string=self._get_enhanced_css())]
        )
        
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
        
        # Use ReportLab fallback if WeasyPrint is not available
        if not self.use_weasyprint:
            return self.reportlab_generator.generate_purchase_order_pdf(
                seller=seller,
                supplier=supplier,
                items=items,
                po_number=po_number,
                reference=reference,
                output_filename=output_filename
            )
        
        if not output_filename:
            date_str = datetime.now().strftime('%Y%m%d')
            po_num = po_number or f"AIBA-PO-{datetime.now().strftime('%Y%m%d%H%M')}"
            output_filename = f"PurchaseOrder_{po_num.replace('/', '_')}_{date_str}.pdf"
        
        output_path = os.path.join('data', output_filename)
        
        # Generate PO items HTML
        po_items_html = self._generate_po_item_rows(items)
        
        # Create HTML content for PO
        html_content = self._generate_po_html_template(
            seller=seller,
            supplier=supplier,
            items_html=po_items_html,
            po_number=po_number or f"AIBA-PO-{datetime.now().strftime('%Y%m%d%H%M')}",
            reference=reference,
            date_str=datetime.now().strftime('%d %B %Y')
        )
        
        # Generate PDF using WeasyPrint
        from weasyprint import HTML, CSS
        HTML(string=html_content).write_pdf(
            output_path,
            stylesheets=[CSS(string=self._get_enhanced_css())]
        )
        
        return output_filename
    
    def _generate_item_rows(self, items: list) -> tuple:
        """Generate HTML rows for items table and calculate subtotal"""
        rows_html = ""
        subtotal = 0
        
        for i, item in enumerate(items, start=1):
            # Calculate weight for steel items
            if all(key in item for key in ['thk', 'w', 'l', 'nos']):
                # Steel plate/sheet calculation: thickness × width × length × density × quantity
                weight = round((item['thk'] * item['w'] * item['l'] * 7.85 * item['nos']) / 1_000_000, 2)
                quantity_display = f"{weight:.2f} kg"
            else:
                # For other items, use provided quantity
                weight = item.get('weight', item.get('quantity', 0))
                unit = item.get('unit', 'kg')
                quantity_display = f"{weight} {unit}"
            
            rate = item.get('rate', 0)
            amount = round(float(weight) * float(rate), 2)
            subtotal += amount
            
            rows_html += f"""
                <tr>
                    <td class="text-center">{i}</td>
                    <td>{item['desc']}</td>
                    <td class="text-center">{quantity_display}</td>
                    <td class="text-right">₹{rate:.2f}</td>
                    <td class="text-right">₹{amount:,.2f}</td>
                </tr>
            """
        
        return rows_html, subtotal
    
    def _generate_po_item_rows(self, items: list) -> str:
        """Generate HTML rows for PO items table"""
        rows_html = ""
        
        if not items:
            rows_html = """
                <tr>
                    <td class="text-center">1</td>
                    <td>Items as per quotation/specification</td>
                    <td class="text-center">As required</td>
                    <td class="text-center">Various</td>
                    <td>As per agreed terms</td>
                </tr>
            """
        else:
            for i, item in enumerate(items, start=1):
                rows_html += f"""
                    <tr>
                        <td class="text-center">{i}</td>
                        <td>{item.get('description', item.get('desc', 'Item'))}</td>
                        <td class="text-center">{item.get('quantity', 'TBD')}</td>
                        <td class="text-center">{item.get('unit', 'nos')}</td>
                        <td>{item.get('remarks', 'As per specification')}</td>
                    </tr>
                """
        
        return rows_html
    
    def _generate_html_template(self, **kwargs) -> str:
        """Generate complete HTML template with modern styling"""
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Steel Quotation - {kwargs['seller']['name']}</title>
        </head>
        <body>
            <div class="container">
                <!-- Header -->
                <div class="header">
                    <div class="header-content">
                        <div class="company-name">{kwargs['seller']['name']}</div>
                        <div class="company-tagline">Professional Steel Solutions & Engineering Services</div>
                        <div class="company-details">
                            <div class="contact-info">
                                <div class="contact-item">
                                    <span class="icon">📍</span>
                                    <span>{kwargs['seller']['address']}</span>
                                </div>
                                <div class="contact-item">
                                    <span class="icon">✉️</span>
                                    <span>{kwargs['seller']['email']}</span>
                                </div>
                                <div class="contact-item">
                                    <span class="icon">🏛️</span>
                                    <span>GST: {kwargs['seller']['gstin']}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="content">
                    <!-- Document Header -->
                    <div class="document-header">
                        <div>
                            <div class="document-title">STEEL QUOTATION</div>
                            <div class="document-subtitle">Professional Steel Material Quote</div>
                        </div>
                        <div class="document-meta">
                            <div class="meta-item">
                                <span class="meta-label">Quote #:</span> {kwargs['quote_number']}
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Date:</span> {kwargs['date_str']}
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Valid Until:</span> {kwargs['validity_date']}
                            </div>
                        </div>
                    </div>

                    <!-- Customer Section -->
                    <div class="customer-section">
                        <div class="customer-title">Quotation Prepared For:</div>
                        <div class="customer-name">{kwargs['buyer']['name']}</div>
                        <div class="customer-address">{kwargs['buyer']['address']}</div>
                        <div class="customer-details">
                            <span>Email: {kwargs['buyer']['email']}</span>
                            <span>GST: {kwargs['buyer']['gstin']}</span>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <div class="items-section">
                        <div class="section-title">Steel Materials & Specifications</div>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Material Description</th>
                                    <th>Quantity</th>
                                    <th>Rate</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kwargs['items_html']}
                            </tbody>
                        </table>
                    </div>

                    <!-- Totals Section -->
                    <div class="totals-section">
                        <div class="totals-table">
                            <div class="total-row">
                                <span class="total-label">Subtotal:</span>
                                <span class="total-amount">₹{kwargs['subtotal']:,.2f}</span>
                            </div>
                            <div class="total-row">
                                <span class="total-label">GST ({kwargs['gst_rate']}%):</span>
                                <span class="total-amount">₹{kwargs['gst_amount']:,.2f}</span>
                            </div>
                            <div class="total-row final-total">
                                <span>Grand Total:</span>
                                <span>₹{kwargs['grand_total']:,.2f}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Terms Section -->
                    <div class="terms-section">
                        <div class="terms-title">Terms & Conditions</div>
                        <ul class="terms-list">
                            <li>Loading Charges: {kwargs['terms'].get('loading', 'Included')}</li>
                            <li>Transport Charges: {kwargs['terms'].get('transport', 'Included')}</li>
                            <li>Payment Terms: {kwargs['terms'].get('payment', 'Included')}</li>
                            <li>This quotation is valid for 30 days from the date of issue</li>
                            <li>All prices are subject to GST as applicable</li>
                            <li>Material quality as per IS specifications</li>
                        </ul>
                    </div>

                    <!-- Bank Details & Footer -->
                    <div class="footer">
                        <div class="bank-details">
                            <div class="bank-title">Bank Details for Payment:</div>
                            <div class="bank-info">
                                <div><strong>Account Name:</strong> {kwargs['bank']['account_name']}</div>
                                <div><strong>Account Number:</strong> {kwargs['bank']['account_number']}</div>
                                <div><strong>IFSC Code:</strong> {kwargs['bank']['ifsc']}</div>
                                <div><strong>Branch:</strong> {kwargs['bank']['branch']}</div>
                            </div>
                        </div>
                        <div class="signature-section">
                            <div class="signature-line"></div>
                            <div class="signature-title">Authorized Signatory</div>
                            <div class="signature-company">{kwargs['seller']['name']}</div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _generate_po_html_template(self, **kwargs) -> str:
        """Generate HTML template for Purchase Order"""
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Purchase Order - {kwargs['seller']['name']}</title>
        </head>
        <body>
            <div class="container">
                <!-- Header -->
                <div class="header po-header">
                    <div class="header-content">
                        <div class="company-name">{kwargs['seller']['name']}</div>
                        <div class="company-tagline">Professional Steel Solutions & Engineering Services</div>
                        <div class="company-details">
                            <div class="contact-info">
                                <div class="contact-item">
                                    <span class="icon">📍</span>
                                    <span>{kwargs['seller']['address']}</span>
                                </div>
                                <div class="contact-item">
                                    <span class="icon">✉️</span>
                                    <span>{kwargs['seller']['email']}</span>
                                </div>
                                <div class="contact-item">
                                    <span class="icon">🏛️</span>
                                    <span>GST: {kwargs['seller']['gstin']}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="content">
                    <!-- Document Header -->
                    <div class="document-header">
                        <div>
                            <div class="document-title">PURCHASE ORDER</div>
                            <div class="document-subtitle">Official Purchase Order</div>
                        </div>
                        <div class="document-meta">
                            <div class="meta-item">
                                <span class="meta-label">PO #:</span> {kwargs['po_number']}
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Date:</span> {kwargs['date_str']}
                            </div>
                            {f'<div class="meta-item"><span class="meta-label">Reference:</span> {kwargs["reference"]}</div>' if kwargs.get('reference') else ''}
                        </div>
                    </div>

                    <!-- Supplier Section -->
                    <div class="customer-section supplier-section">
                        <div class="customer-title">Purchase Order To:</div>
                        <div class="customer-name">{kwargs['supplier']['name']}</div>
                        <div class="customer-address">{kwargs['supplier'].get('address', '')}</div>
                    </div>

                    <!-- Items Table -->
                    <div class="items-section">
                        <div class="section-title">Items & Specifications</div>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Description</th>
                                    <th>Quantity</th>
                                    <th>Unit</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kwargs['items_html']}
                            </tbody>
                        </table>
                    </div>

                    <!-- Terms Section -->
                    <div class="terms-section">
                        <div class="terms-title">Terms & Conditions</div>
                        <ul class="terms-list">
                            <li>Supply items as per specification and delivery schedule</li>
                            <li>Quality of materials should meet industry standards</li>
                            <li>Payment will be made as per agreed terms</li>
                            <li>Any damage during transport is supplier's responsibility</li>
                            <li>Delivery location: As specified in the order</li>
                            <li>All applicable taxes and duties to be borne by supplier</li>
                        </ul>
                    </div>

                    <!-- Footer -->
                    <div class="footer">
                        <div></div>
                        <div class="signature-section">
                            <div class="signature-line"></div>
                            <div class="signature-title">Authorized Signatory</div>
                            <div class="signature-company">{kwargs['seller']['name']}</div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _get_enhanced_css(self) -> str:
        """Get enhanced CSS for modern steel industry styling"""
        return """
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: #ffffff;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
        }
        
        /* Header with Steel Industry Theme */
        .header {
            background: linear-gradient(135deg, #2c5282 0%, #2a4365 100%);
            color: white;
            padding: 40px 50px;
            position: relative;
            overflow: hidden;
        }
        
        .po-header {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 100px;
            height: 100px;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="20" height="100" fill="rgba(255,255,255,0.1)"/><rect x="30" width="20" height="100" fill="rgba(255,255,255,0.05)"/><rect x="60" width="20" height="100" fill="rgba(255,255,255,0.1)"/></svg>');
            opacity: 0.3;
        }
        
        .header-content {
            position: relative;
            z-index: 2;
        }
        
        .company-name {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }
        
        .company-tagline {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 20px;
            font-weight: 300;
        }
        
        .contact-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .contact-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }
        
        .icon {
            width: 16px;
            text-align: center;
        }
        
        /* Content Styling */
        .content {
            padding: 40px 50px;
        }
        
        .document-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #e2e8f0;
        }
        
        .document-title {
            font-size: 28px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 5px;
        }
        
        .document-subtitle {
            font-size: 16px;
            color: #718096;
        }
        
        .document-meta {
            text-align: right;
            font-size: 14px;
            color: #4a5568;
        }
        
        .meta-item {
            margin-bottom: 6px;
        }
        
        .meta-label {
            font-weight: 600;
            color: #2d3748;
        }
        
        /* Customer Section */
        .customer-section {
            background: #f7fafc;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #2c5282;
        }
        
        .supplier-section {
            background: #f0fff4;
            border-left: 4px solid #48bb78;
        }
        
        .customer-title {
            font-size: 16px;
            font-weight: 600;
            color: #4a5568;
            margin-bottom: 8px;
        }
        
        .customer-name {
            font-size: 22px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 5px;
        }
        
        .customer-address {
            color: #4a5568;
            margin-bottom: 8px;
        }
        
        .customer-details {
            display: flex;
            gap: 20px;
            font-size: 14px;
            color: #4a5568;
        }
        
        /* Items Table */
        .items-section {
            margin: 40px 0;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .items-table th {
            background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
            color: white;
            padding: 16px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-table td {
            padding: 14px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
        }
        
        .items-table tbody tr:hover {
            background: #f8fafc;
        }
        
        .items-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        
        /* Totals Section */
        .totals-section {
            margin-top: 30px;
            display: flex;
            justify-content: flex-end;
        }
        
        .totals-table {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            min-width: 300px;
            border: 1px solid #e2e8f0;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            font-size: 15px;
        }
        
        .total-row:not(:last-child) {
            border-bottom: 1px solid #e2e8f0;
        }
        
        .total-label {
            font-weight: 500;
            color: #4a5568;
        }
        
        .total-amount {
            font-weight: 600;
            color: #2d3748;
        }
        
        .final-total {
            background: linear-gradient(135deg, #2c5282 0%, #2a4365 100%);
            color: white;
            margin: 15px -20px -20px;
            padding: 15px 20px;
            border-radius: 0 0 8px 8px;
            font-size: 16px;
            font-weight: 700;
        }
        
        /* Terms Section */
        .terms-section {
            margin-top: 40px;
            background: #f0fff4;
            padding: 25px;
            border-radius: 8px;
            border-left: 4px solid #38a169;
        }
        
        .terms-title {
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 15px;
        }
        
        .terms-list {
            list-style: none;
            padding: 0;
        }
        
        .terms-list li {
            padding: 6px 0;
            font-size: 14px;
            color: #4a5568;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .terms-list li:last-child {
            border-bottom: none;
        }
        
        .terms-list li::before {
            content: "⚙️";
            margin-right: 10px;
        }
        
        /* Footer */
        .footer {
            margin-top: 40px;
            padding: 25px 0;
            border-top: 2px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        
        .bank-details {
            flex: 1;
            font-size: 13px;
            color: #4a5568;
        }
        
        .bank-title {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .bank-info div {
            margin-bottom: 4px;
        }
        
        .signature-section {
            text-align: center;
            min-width: 180px;
            margin-left: 40px;
        }
        
        .signature-line {
            border-top: 2px solid #2d3748;
            margin-bottom: 8px;
            padding-top: 50px;
        }
        
        .signature-title {
            font-weight: 600;
            color: #2d3748;
            font-size: 14px;
        }
        
        .signature-company {
            font-size: 13px;
            color: #2c5282;
            font-weight: 500;
        }
        
        /* Print Optimization */
        @page {
            size: A4;
            margin: 0.5in;
        }
        
        @media print {
            body { -webkit-print-color-adjust: exact !important; }
            .header::before { display: none; }
        }
        """ 