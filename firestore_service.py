"""
Firestore Service for AIBA
Replaces JSON file storage with scalable Firestore database
"""

import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json
import os

class FirestoreService:
    def __init__(self):
        """Initialize Firestore service."""
        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            try:
                cred = credentials.Certificate("firebase-auth.json")
                firebase_admin.initialize_app(cred)
            except Exception as e:
                print(f"Firebase initialization error: {e}")
                raise
        
        self.db = firestore.client()
        
        # Collection names
        self.USERS_COLLECTION = 'users'
        self.PROFILES_COLLECTION = 'user_profiles'
        self.CUSTOMERS_COLLECTION = 'customers'
        self.CHAT_SESSIONS_COLLECTION = 'chat_sessions'
        self.QUOTATIONS_COLLECTION = 'quotations'
        self.PURCHASE_ORDERS_COLLECTION = 'purchase_orders'
        self.BUSINESS_PROFILES_COLLECTION = 'business_profiles'
        self.DOCUMENTS_COLLECTION = 'user_documents'
        self.DOCUMENTS_CONTENT_COLLECTION = 'document_content'
    
    # ========================================
    # USER MANAGEMENT
    # ========================================
    
    def save_user(self, email: str, user_data: Dict) -> bool:
        """Save user data to Firestore."""
        try:
            user_ref = self.db.collection(self.USERS_COLLECTION).document(email)
            user_data['created_at'] = firestore.SERVER_TIMESTAMP
            user_data['updated_at'] = firestore.SERVER_TIMESTAMP
            user_ref.set(user_data)
            return True
        except Exception as e:
            print(f"Error saving user: {e}")
            return False
    
    def get_user(self, email: str) -> Optional[Dict]:
        """Get user data by email."""
        try:
            user_ref = self.db.collection(self.USERS_COLLECTION).document(email)
            doc = user_ref.get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    def update_user(self, email: str, updates: Dict) -> bool:
        """Update user data."""
        try:
            user_ref = self.db.collection(self.USERS_COLLECTION).document(email)
            updates['updated_at'] = firestore.SERVER_TIMESTAMP
            user_ref.update(updates)
            return True
        except Exception as e:
            print(f"Error updating user: {e}")
            return False
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by user_id field."""
        try:
            users_ref = self.db.collection(self.USERS_COLLECTION)
            query = users_ref.where('user_id', '==', user_id).limit(1)
            docs = query.stream()
            
            for doc in docs:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None
    
    # ========================================
    # USER PROFILES
    # ========================================
    
    def save_user_profile(self, user_id: str, profile_data: Dict) -> bool:
        """Save user business profile."""
        try:
            profile_ref = self.db.collection(self.PROFILES_COLLECTION).document(user_id)
            profile_data['user_id'] = user_id
            profile_data['created_at'] = firestore.SERVER_TIMESTAMP
            profile_data['updated_at'] = firestore.SERVER_TIMESTAMP
            profile_ref.set(profile_data)
            return True
        except Exception as e:
            print(f"Error saving profile: {e}")
            return False
    
    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Get user business profile."""
        try:
            profile_ref = self.db.collection(self.PROFILES_COLLECTION).document(user_id)
            doc = profile_ref.get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"Error getting profile: {e}")
            return None
    
    def update_user_profile(self, user_id: str, updates: Dict) -> bool:
        """Update user profile."""
        try:
            profile_ref = self.db.collection(self.PROFILES_COLLECTION).document(user_id)
            updates['updated_at'] = firestore.SERVER_TIMESTAMP
            profile_ref.update(updates)
            return True
        except Exception as e:
            print(f"Error updating profile: {e}")
            return False
    
    # ========================================
    # CUSTOMER MANAGEMENT
    # ========================================
    
    def save_customer(self, user_id: str, customer_data: Dict) -> bool:
        """Save customer data."""
        try:
            customer_name = customer_data.get('customer_name', '').lower()
            if not customer_name:
                return False
            
            # Use composite key: user_id + customer_name
            doc_id = f"{user_id}_{customer_name}"
            customer_ref = self.db.collection(self.CUSTOMERS_COLLECTION).document(doc_id)
            
            customer_data['user_id'] = user_id
            customer_data['saved_date'] = firestore.SERVER_TIMESTAMP
            customer_ref.set(customer_data)
            return True
        except Exception as e:
            print(f"Error saving customer: {e}")
            return False
    
    def get_customer(self, user_id: str, customer_name: str) -> Optional[Dict]:
        """Get customer data."""
        try:
            doc_id = f"{user_id}_{customer_name.lower()}"
            customer_ref = self.db.collection(self.CUSTOMERS_COLLECTION).document(doc_id)
            doc = customer_ref.get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"Error getting customer: {e}")
            return None
    
    def get_user_customers(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get all customers for a user."""
        try:
            customers_ref = self.db.collection(self.CUSTOMERS_COLLECTION)
            query = customers_ref.where('user_id', '==', user_id).limit(limit)
            docs = query.stream()
            
            customers = []
            for doc in docs:
                customers.append(doc.to_dict())
            return customers
        except Exception as e:
            print(f"Error getting customers: {e}")
            return []
    
    def search_customers(self, user_id: str, search_term: str) -> List[Dict]:
        """Search customers by name."""
        try:
            customers_ref = self.db.collection(self.CUSTOMERS_COLLECTION)
            # Note: Firestore doesn't support full-text search natively
            # This is a simple prefix search
            query = customers_ref.where('user_id', '==', user_id)
            docs = query.stream()
            
            results = []
            search_lower = search_term.lower()
            for doc in docs:
                data = doc.to_dict()
                customer_name = data.get('customer_name', '').lower()
                if search_lower in customer_name:
                    results.append(data)
            
            return results
        except Exception as e:
            print(f"Error searching customers: {e}")
            return []
    
    # ========================================
    # CHAT SESSIONS
    # ========================================
    
    def save_chat_session(self, session_id: str, session_data: Dict) -> bool:
        """Save chat session data."""
        try:
            session_ref = self.db.collection(self.CHAT_SESSIONS_COLLECTION).document(session_id)
            session_data['last_updated'] = firestore.SERVER_TIMESTAMP
            session_ref.set(session_data, merge=True)
            return True
        except Exception as e:
            print(f"Error saving chat session: {e}")
            return False
    
    def get_chat_session(self, session_id: str) -> Optional[Dict]:
        """Get chat session data."""
        try:
            session_ref = self.db.collection(self.CHAT_SESSIONS_COLLECTION).document(session_id)
            doc = session_ref.get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"Error getting chat session: {e}")
            return None
    
    def update_chat_session(self, session_id: str, updates: Dict) -> bool:
        """Update chat session."""
        try:
            session_ref = self.db.collection(self.CHAT_SESSIONS_COLLECTION).document(session_id)
            updates['last_updated'] = firestore.SERVER_TIMESTAMP
            session_ref.update(updates)
            return True
        except Exception as e:
            print(f"Error updating chat session: {e}")
            return False
    
    def delete_chat_session(self, session_id: str) -> bool:
        """Delete chat session."""
        try:
            session_ref = self.db.collection(self.CHAT_SESSIONS_COLLECTION).document(session_id)
            session_ref.delete()
            return True
        except Exception as e:
            print(f"Error deleting chat session: {e}")
            return False
    
    def cleanup_old_sessions(self, hours: int = 24) -> int:
        """Clean up old chat sessions."""
        try:
            cutoff_time = datetime.now() - timedelta(hours=hours)
            sessions_ref = self.db.collection(self.CHAT_SESSIONS_COLLECTION)
            
            # Firestore timestamp comparison
            query = sessions_ref.where('last_updated', '<', cutoff_time)
            docs = query.stream()
            
            deleted_count = 0
            for doc in docs:
                doc.reference.delete()
                deleted_count += 1
            
            return deleted_count
        except Exception as e:
            print(f"Error cleaning up sessions: {e}")
            return 0
    
    # ========================================
    # QUOTATIONS
    # ========================================
    
    def save_quotation(self, user_id: str, quotation_data: Dict) -> str:
        """Save quotation and return quotation ID."""
        try:
            # Generate quotation ID
            quote_id = f"Q{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            quotation_ref = self.db.collection(self.QUOTATIONS_COLLECTION).document(quote_id)
            quotation_data.update({
                'id': quote_id,
                'user_id': user_id,
                'created_date': firestore.SERVER_TIMESTAMP,
                'status': 'created'
            })
            quotation_ref.set(quotation_data)
            return quote_id
        except Exception as e:
            print(f"Error saving quotation: {e}")
            return ""
    
    def get_quotation(self, quote_id: str) -> Optional[Dict]:
        """Get quotation by ID."""
        try:
            quote_ref = self.db.collection(self.QUOTATIONS_COLLECTION).document(quote_id)
            doc = quote_ref.get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"Error getting quotation: {e}")
            return None
    
    def get_user_quotations(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get user's quotations."""
        try:
            quotes_ref = self.db.collection(self.QUOTATIONS_COLLECTION)
            query = quotes_ref.where('user_id', '==', user_id)\
                             .order_by('created_date', direction=firestore.Query.DESCENDING)\
                             .limit(limit)
            docs = query.stream()
            
            quotations = []
            for doc in docs:
                quotations.append(doc.to_dict())
            return quotations
        except Exception as e:
            print(f"Error getting quotations: {e}")
            return []
    
    def update_quotation_status(self, quote_id: str, status: str) -> bool:
        """Update quotation status."""
        try:
            quote_ref = self.db.collection(self.QUOTATIONS_COLLECTION).document(quote_id)
            quote_ref.update({
                'status': status,
                'updated_date': firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            print(f"Error updating quotation status: {e}")
            return False
    
    # ========================================
    # PURCHASE ORDERS
    # ========================================
    
    def save_purchase_order(self, user_id: str, po_data: Dict) -> str:
        """Save purchase order and return PO ID."""
        try:
            # Use provided PO number or generate one
            po_id = po_data.get('po_number', f"PO{datetime.now().strftime('%Y%m%d%H%M%S')}")
            
            po_ref = self.db.collection(self.PURCHASE_ORDERS_COLLECTION).document(po_id)
            po_data.update({
                'id': po_id,
                'user_id': user_id,
                'created_date': firestore.SERVER_TIMESTAMP,
                'status': 'created'
            })
            po_ref.set(po_data)
            return po_id
        except Exception as e:
            print(f"Error saving purchase order: {e}")
            return ""
    
    def get_purchase_order(self, po_id: str) -> Optional[Dict]:
        """Get purchase order by ID."""
        try:
            po_ref = self.db.collection(self.PURCHASE_ORDERS_COLLECTION).document(po_id)
            doc = po_ref.get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"Error getting purchase order: {e}")
            return None
    
    def get_user_purchase_orders(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get user's purchase orders."""
        try:
            pos_ref = self.db.collection(self.PURCHASE_ORDERS_COLLECTION)
            query = pos_ref.where('user_id', '==', user_id)\
                          .order_by('created_date', direction=firestore.Query.DESCENDING)\
                          .limit(limit)
            docs = query.stream()
            
            purchase_orders = []
            for doc in docs:
                purchase_orders.append(doc.to_dict())
            return purchase_orders
        except Exception as e:
            print(f"Error getting purchase orders: {e}")
            return []
    
    def update_po_status(self, po_id: str, status: str) -> bool:
        """Update purchase order status."""
        try:
            po_ref = self.db.collection(self.PURCHASE_ORDERS_COLLECTION).document(po_id)
            po_ref.update({
                'status': status,
                'updated_date': firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            print(f"Error updating PO status: {e}")
            return False
    
    # ========================================
    # DOCUMENT MANAGEMENT
    # ========================================
    
    def save_document(self, user_id: str, document_data: Dict, pdf_content: bytes = None) -> str:
        """Save a PDF document to Firestore with improved structure."""
        try:
            # Generate a unique document ID with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            doc_type_prefix = document_data.get('document_type', 'doc')[:3].upper()
            doc_id = f"{user_id}_{doc_type_prefix}_{timestamp}_{firestore.SERVER_TIMESTAMP}"
            
            # Use the generated ID as document ID for better organization
            doc_ref = self.db.collection(self.DOCUMENTS_COLLECTION).document()
            actual_doc_id = doc_ref.id  # Firestore auto-generated ID
            
            # Prepare document metadata with proper structure
            metadata = {
                'document_id': actual_doc_id,
                'user_id': user_id,
                'document_type': document_data.get('document_type', 'unknown'),
                'document_name': document_data.get('document_name', 'Untitled'),
                'document_number': document_data.get('document_number', ''),
                'customer_name': document_data.get('customer_name', ''),
                'customer_address': document_data.get('customer_address', ''),
                'customer_email': document_data.get('customer_email', ''),
                'customer_gstin': document_data.get('customer_gstin', ''),
                'quote_number': document_data.get('quote_number', ''),
                'po_number': document_data.get('po_number', ''),
                'grand_total': document_data.get('grand_total', 0),
                'items_count': document_data.get('items_count', 0),
                'items_summary': document_data.get('items_summary', ''),
                'file_path': document_data.get('file_path', ''),
                'file_size': len(pdf_content) if pdf_content else 0,
                'creation_source': document_data.get('creation_source', 'aiba'),
                'status': 'active',
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP
            }
            
            # Save metadata to main documents collection
            doc_ref.set(metadata)
            
            # Save PDF content separately for better performance
            if pdf_content:
                import base64
                pdf_b64 = base64.b64encode(pdf_content).decode('utf-8')
                content_ref = self.db.collection(self.DOCUMENTS_CONTENT_COLLECTION).document(actual_doc_id)
                content_ref.set({
                    'document_id': actual_doc_id,
                    'user_id': user_id,  # Add user_id for security
                    'content': pdf_b64,
                    'content_type': 'application/pdf',
                    'encoding': 'base64',
                    'created_at': firestore.SERVER_TIMESTAMP
                })
            
            return actual_doc_id
            
        except Exception as e:
            print(f"Error saving document to Firestore: {e}")
            return None
    
    def get_document(self, doc_id: str) -> Optional[Dict]:
        """Get document metadata by ID."""
        try:
            doc_ref = self.db.collection(self.DOCUMENTS_COLLECTION).document(doc_id)
            doc = doc_ref.get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"Error getting document: {e}")
            return None
    
    def get_document_content(self, doc_id: str) -> Optional[bytes]:
        """Get PDF content by document ID."""
        try:
            content_ref = self.db.collection(self.DOCUMENTS_CONTENT_COLLECTION).document(doc_id)
            doc = content_ref.get()
            if doc.exists:
                import base64
                content_data = doc.to_dict()
                pdf_b64 = content_data.get('content', '')
                return base64.b64decode(pdf_b64) if pdf_b64 else None
            return None
        except Exception as e:
            print(f"Error getting document content: {e}")
            return None
    
    def get_user_documents(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get all documents for a user."""
        try:
            docs_ref = self.db.collection(self.DOCUMENTS_COLLECTION)
            
            # Simplified query to avoid index requirement - filter by user_id only
            query = docs_ref.where('user_id', '==', user_id).limit(limit * 2)  # Get more to filter locally
            docs = query.stream()
            
            documents = []
            for doc in docs:
                doc_data = doc.to_dict()
                
                # Filter out deleted documents locally
                if doc_data.get('status') != 'active':
                    continue
                
                # Convert timestamp to string for JSON serialization
                if 'created_at' in doc_data and doc_data['created_at']:
                    try:
                        doc_data['created_at_str'] = doc_data['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                    except:
                        doc_data['created_at_str'] = 'Unknown date'
                else:
                    doc_data['created_at_str'] = 'Unknown date'
                    
                documents.append(doc_data)
                
                # Stop when we have enough documents
                if len(documents) >= limit:
                    break
            
            # Sort by created_at locally (newest first)
            documents.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)
            
            return documents
            
        except Exception as e:
            print(f"Error getting user documents: {e}")
            return []
    
    def delete_document(self, doc_id: str, user_id: str) -> bool:
        """Soft delete a document (mark as deleted)."""
        try:
            # Verify ownership
            doc_ref = self.db.collection(self.DOCUMENTS_COLLECTION).document(doc_id)
            doc = doc_ref.get()
            if not doc.exists:
                return False
            
            doc_data = doc.to_dict()
            if doc_data.get('user_id') != user_id:
                return False  # User doesn't own this document
            
            # Soft delete
            doc_ref.update({
                'status': 'deleted',
                'deleted_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False
    
    def search_user_documents(self, user_id: str, search_term: str, doc_type: str = None) -> List[Dict]:
        """Search user documents by name or customer."""
        try:
            docs_ref = self.db.collection(self.DOCUMENTS_COLLECTION)
            # Simple query to avoid index requirements
            query = docs_ref.where('user_id', '==', user_id)
            
            docs = query.stream()
            
            results = []
            search_lower = search_term.lower()
            for doc in docs:
                data = doc.to_dict()
                
                # Filter out deleted documents
                if data.get('status') != 'active':
                    continue
                
                # Filter by document type if specified
                if doc_type and data.get('document_type') != doc_type:
                    continue
                
                # Search in document name, customer name, or quote/PO number
                searchable_text = f"{data.get('document_name', '')} {data.get('customer_name', '')} {data.get('quote_number', '')} {data.get('po_number', '')}".lower()
                if search_lower in searchable_text:
                    if 'created_at' in data and data['created_at']:
                        try:
                            data['created_at_str'] = data['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                        except:
                            data['created_at_str'] = 'Unknown date'
                    else:
                        data['created_at_str'] = 'Unknown date'
                    results.append(data)
            
            # Sort by created_at (newest first)
            results.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)
            
            return results
        except Exception as e:
            print(f"Error searching documents: {e}")
            return []

    # ========================================
    # ANALYTICS & REPORTING
    # ========================================
    
    def get_user_stats(self, user_id: str) -> Dict:
        """Get user statistics."""
        try:
            stats = {
                'total_quotations': 0,
                'total_purchase_orders': 0,
                'total_customers': 0,
                'total_documents': 0,
                'active_sessions': 0
            }
            
            # Count quotations
            quotes_ref = self.db.collection(self.QUOTATIONS_COLLECTION)
            quotes_query = quotes_ref.where('user_id', '==', user_id)
            stats['total_quotations'] = len(list(quotes_query.stream()))
            
            # Count purchase orders
            pos_ref = self.db.collection(self.PURCHASE_ORDERS_COLLECTION)
            pos_query = pos_ref.where('user_id', '==', user_id)
            stats['total_purchase_orders'] = len(list(pos_query.stream()))
            
            # Count customers
            customers_ref = self.db.collection(self.CUSTOMERS_COLLECTION)
            customers_query = customers_ref.where('user_id', '==', user_id)
            stats['total_customers'] = len(list(customers_query.stream()))
            
            # Count documents
            docs_ref = self.db.collection(self.DOCUMENTS_COLLECTION)
            docs_query = docs_ref.where('user_id', '==', user_id).where('status', '==', 'active')
            stats['total_documents'] = len(list(docs_query.stream()))
            
            return stats
        except Exception as e:
            print(f"Error getting user stats: {e}")
            return {}
    
    # ========================================
    # MIGRATION UTILITIES
    # ========================================
    
    def migrate_from_json(self, json_data_dir: str = 'data') -> Dict:
        """Migrate existing JSON data to Firestore."""
        migration_results = {
            'users': 0,
            'profiles': 0,
            'customers': 0,
            'errors': []
        }
        
        try:
            # Migrate users
            users_file = os.path.join(json_data_dir, 'users.json')
            if os.path.exists(users_file):
                with open(users_file, 'r') as f:
                    users_data = json.load(f)
                    for email, user_data in users_data.items():
                        if self.save_user(email, user_data):
                            migration_results['users'] += 1
            
            # Migrate profiles
            profiles_file = os.path.join(json_data_dir, 'user_profiles.json')
            if os.path.exists(profiles_file):
                with open(profiles_file, 'r') as f:
                    profiles_data = json.load(f)
                    for user_id, profile_data in profiles_data.items():
                        if self.save_user_profile(user_id, profile_data):
                            migration_results['profiles'] += 1
            
            # Migrate customers (if any exist)
            customers_file = os.path.join(json_data_dir, 'saved_customers.json')
            if os.path.exists(customers_file):
                with open(customers_file, 'r') as f:
                    customers_data = json.load(f)
                    for customer_name, customer_data in customers_data.items():
                        # For existing customers, we'll need to associate them with the first user
                        # This is a simplified migration - in reality you might need manual mapping
                        user_id = customer_data.get('user_id', 'unknown')
                        if user_id != 'unknown' and self.save_customer(user_id, customer_data):
                            migration_results['customers'] += 1
            
        except Exception as e:
            migration_results['errors'].append(str(e))
        
        return migration_results
    
    def backup_to_json(self, backup_dir: str = 'backup') -> bool:
        """Backup Firestore data to JSON files."""
        try:
            os.makedirs(backup_dir, exist_ok=True)
            
            # Backup users
            users_ref = self.db.collection(self.USERS_COLLECTION)
            users_data = {}
            for doc in users_ref.stream():
                users_data[doc.id] = doc.to_dict()
            
            with open(os.path.join(backup_dir, 'users_backup.json'), 'w') as f:
                json.dump(users_data, f, indent=2, default=str)
            
            # Backup profiles
            profiles_ref = self.db.collection(self.PROFILES_COLLECTION)
            profiles_data = {}
            for doc in profiles_ref.stream():
                profiles_data[doc.id] = doc.to_dict()
            
            with open(os.path.join(backup_dir, 'profiles_backup.json'), 'w') as f:
                json.dump(profiles_data, f, indent=2, default=str)
            
            return True
        except Exception as e:
            print(f"Error backing up data: {e}")
            return False

# Global instance
firestore_service = FirestoreService() 