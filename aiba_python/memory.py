"""
Memory Module for AIBA
Handles storage and retrieval of business profiles and customer details.
"""

import json
import os
from typing import Dict, Optional, List
from datetime import datetime

class BusinessMemory:
    def __init__(self):
        self.data_dir = 'data'
        self.business_file = os.path.join(self.data_dir, 'business_profile.json')
        self.customers_file = os.path.join(self.data_dir, 'customers.json')
        self.quotations_file = os.path.join(self.data_dir, 'quotations.json')
        self.pos_file = os.path.join(self.data_dir, 'purchase_orders.json')
        
        # Ensure data directory exists
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Initialize files if they don't exist
        self._init_files()
        
    def _init_files(self):
        """Initialize JSON files with default structure if they don't exist."""
        default_files = {
            self.business_file: self._get_default_business_profile(),
            self.customers_file: {},
            self.quotations_file: [],
            self.pos_file: []
        }
        
        for filepath, default_data in default_files.items():
            if not os.path.exists(filepath):
                self._save_json(filepath, default_data)
                
    def _load_json(self, filepath: str) -> dict:
        """Load data from JSON file."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
            
    def _save_json(self, filepath: str, data):
        """Save data to JSON file."""
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving to {filepath}: {e}")
            
    def get_business_profile(self) -> Dict:
        """Get current business profile."""
        return self._load_json(self.business_file)
        
    def update_business_profile(self, profile_data: Dict):
        """Update business profile."""
        current_profile = self.get_business_profile()
        current_profile.update(profile_data)
        self._save_json(self.business_file, current_profile)
        
    def save_customer(self, customer_name: str, customer_data: Dict):
        """Save or update customer information."""
        customers = self._load_json(self.customers_file)
        customers[customer_name.lower()] = {
            'name': customer_name,
            'created_date': datetime.now().isoformat(),
            **customer_data
        }
        self._save_json(self.customers_file, customers)
        
    def get_customer(self, customer_name: str) -> Optional[Dict]:
        """Get customer information by name."""
        customers = self._load_json(self.customers_file)
        return customers.get(customer_name.lower())
        
    def search_customers(self, search_term: str) -> List[Dict]:
        """Search customers by name or other fields."""
        customers = self._load_json(self.customers_file)
        search_term = search_term.lower()
        
        results = []
        for customer_data in customers.values():
            if search_term in customer_data.get('name', '').lower():
                results.append(customer_data)
                
        return results
        
    def save_quotation(self, quotation_data: Dict) -> str:
        """Save quotation data and return quotation ID."""
        quotations = self._load_json(self.quotations_file)
        
        # Generate quotation ID
        quote_id = f"Q{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        quotation_record = {
            'id': quote_id,
            'created_date': datetime.now().isoformat(),
            'status': 'created',
            **quotation_data
        }
        
        quotations.append(quotation_record)
        self._save_json(self.quotations_file, quotations)
        
        return quote_id
        
    def save_purchase_order(self, po_data: Dict) -> str:
        """Save purchase order data and return PO ID."""
        pos = self._load_json(self.pos_file)
        
        # Use provided PO number or generate one
        po_id = po_data.get('po_number', f"PO{datetime.now().strftime('%Y%m%d%H%M%S')}")
        
        po_record = {
            'id': po_id,
            'created_date': datetime.now().isoformat(),
            'status': 'created',
            **po_data
        }
        
        pos.append(po_record)
        self._save_json(self.pos_file, pos)
        
        return po_id
        
    def get_quotations(self, limit: int = 10) -> List[Dict]:
        """Get recent quotations."""
        quotations = self._load_json(self.quotations_file)
        return quotations[-limit:] if quotations else []
        
    def get_purchase_orders(self, limit: int = 10) -> List[Dict]:
        """Get recent purchase orders."""
        pos = self._load_json(self.pos_file)
        return pos[-limit:] if pos else []
        
    def get_quotation_by_id(self, quote_id: str) -> Optional[Dict]:
        """Get specific quotation by ID."""
        quotations = self._load_json(self.quotations_file)
        for quote in quotations:
            if quote.get('id') == quote_id:
                return quote
        return None
        
    def get_po_by_id(self, po_id: str) -> Optional[Dict]:
        """Get specific purchase order by ID."""
        pos = self._load_json(self.pos_file)
        for po in pos:
            if po.get('id') == po_id:
                return po
        return None
        
    def update_quotation_status(self, quote_id: str, status: str):
        """Update quotation status (e.g., 'created', 'sent', 'accepted', 'rejected')."""
        quotations = self._load_json(self.quotations_file)
        for quote in quotations:
            if quote.get('id') == quote_id:
                quote['status'] = status
                quote['updated_date'] = datetime.now().isoformat()
                break
        self._save_json(self.quotations_file, quotations)
        
    def update_po_status(self, po_id: str, status: str):
        """Update purchase order status (e.g., 'created', 'sent', 'received', 'completed')."""
        pos = self._load_json(self.pos_file)
        for po in pos:
            if po.get('id') == po_id:
                po['status'] = status
                po['updated_date'] = datetime.now().isoformat()
                break
        self._save_json(self.pos_file, pos)
        
    def get_stats(self) -> Dict:
        """Get basic statistics about stored data."""
        customers = self._load_json(self.customers_file)
        quotations = self._load_json(self.quotations_file)
        pos = self._load_json(self.pos_file)
        
        return {
            'total_customers': len(customers),
            'total_quotations': len(quotations),
            'total_purchase_orders': len(pos),
            'recent_activity': self._get_recent_activity()
        }
        
    def _get_recent_activity(self) -> List[Dict]:
        """Get recent activity across all documents."""
        activity = []
        
        # Recent quotations
        quotations = self._load_json(self.quotations_file)
        for quote in quotations[-5:]:
            activity.append({
                'type': 'quotation',
                'id': quote.get('id'),
                'customer': quote.get('customer_name'),
                'date': quote.get('created_date'),
                'status': quote.get('status')
            })
            
        # Recent POs
        pos = self._load_json(self.pos_file)
        for po in pos[-5:]:
            activity.append({
                'type': 'purchase_order',
                'id': po.get('id'),
                'supplier': po.get('supplier_name'),
                'date': po.get('created_date'),
                'status': po.get('status')
            })
            
        # Sort by date (most recent first)
        activity.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        return activity[:10]
        
    def _get_default_business_profile(self) -> Dict:
        """Get default business profile structure."""
        return {
            'company_name': 'Your Business Name',
            'address': 'Your Business Address',
            'city': 'Your City',
            'state': 'Your State',
            'pin_code': '000000',
            'phone': '+91-XXXXXXXXXX',
            'email': 'business@example.com',
            'website': 'www.yourbusiness.com',
            'gst_number': 'GST_NUMBER',
            'pan_number': 'PAN_NUMBER',
            'bank_name': 'Your Bank Name',
            'account_number': 'XXXXXXXXXX',
            'ifsc_code': 'IFSC_CODE',
            'setup_completed': False,
            'created_date': datetime.now().isoformat()
        }
        
    def is_setup_completed(self) -> bool:
        """Check if business profile setup is completed."""
        profile = self.get_business_profile()
        return profile.get('setup_completed', False)
        
    def complete_setup(self):
        """Mark business profile setup as completed."""
        profile = self.get_business_profile()
        profile['setup_completed'] = True
        profile['setup_completed_date'] = datetime.now().isoformat()
        self._save_json(self.business_file, profile) 