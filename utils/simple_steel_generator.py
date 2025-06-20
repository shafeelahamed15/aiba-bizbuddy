"""
Simple Steel PDF Generator for AIBA (Windows Compatible)
Pure ReportLab implementation without any WeasyPrint dependencies
"""

from .enhanced_reportlab_generator import EnhancedReportLabGenerator
from datetime import datetime, timedelta
import os
from typing import Dict, List

class SimpleSteelPDFGenerator:
    """Simple Steel PDF Generator using only ReportLab"""
    
    def __init__(self):
        os.makedirs('data', exist_ok=True)
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
        """Generate professional steel quotation PDF using ReportLab"""
        return self.reportlab_generator.generate_quotation_pdf(
            seller=seller,
            buyer=buyer,
            bank=bank,
            items=items,
            terms=terms,
            output_filename=output_filename
        )
    
    def generate_purchase_order_pdf(
        self,
        seller: dict,
        supplier: dict,
        items: list,
        po_number: str = None,
        reference: str = None,
        output_filename: str = None
    ) -> str:
        """Generate professional purchase order PDF using ReportLab"""
        return self.reportlab_generator.generate_purchase_order_pdf(
            seller=seller,
            supplier=supplier,
            items=items,
            po_number=po_number,
            reference=reference,
            output_filename=output_filename
        ) 