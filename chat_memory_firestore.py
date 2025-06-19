"""
Updated ChatMemory using Firestore
Maintains exact same interface as original ChatMemory
"""

from firestore_service import firestore_service
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta

class ChatMemoryFirestore:
    def __init__(self):
        self.fs = firestore_service
        # In-memory cache for active sessions (maintains original behavior)
        self.active_sessions = {}
    
    def get_state(self, session_id: str) -> Dict:
        """
        Get current chat state for a session.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Dictionary containing session state
        """
        # Check in-memory cache first (maintains original behavior)
        if session_id in self.active_sessions:
            return self.active_sessions[session_id]
        
        # Get from Firestore
        session_data = self.fs.get_chat_session(session_id)
        if session_data:
            # Load into memory for faster access (maintains original behavior)
            self.active_sessions[session_id] = session_data
            return session_data
        
        return {}
    
    def update_state(self, session_id: str, state_updates: Dict):
        """
        Update chat state for a session.
        
        Args:
            session_id: Unique session identifier
            state_updates: Dictionary of state updates to apply
        """
        # Get current state
        current_state = self.get_state(session_id)
        
        # Apply updates
        current_state.update(state_updates)
        current_state['last_updated'] = datetime.now().isoformat()
        
        # Update in-memory storage (maintains original behavior)
        self.active_sessions[session_id] = current_state
        
        # Persist to Firestore if important (maintains original logic)
        if self._should_persist_state(current_state):
            self.fs.save_chat_session(session_id, current_state)
    
    def clear_state(self, session_id: str):
        """
        Clear chat state for a session.
        
        Args:
            session_id: Unique session identifier
        """
        # Clear from memory
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
        
        # Clear from Firestore
        self.fs.delete_chat_session(session_id)
    
    def save_customer(self, customer_data: Dict) -> bool:
        """
        Save customer information for future use.
        
        Args:
            customer_data: Dictionary containing customer information
            
        Returns:
            Boolean indicating success
        """
        try:
            customer_name = customer_data.get('customer_name', '').lower()
            if not customer_name:
                return False
            
            # For backward compatibility, we need to associate with a user
            # In the original system, customers weren't user-specific
            # We'll use a default user_id or extract from session context
            user_id = customer_data.get('user_id', 'default_user')
            
            # Add metadata (maintains original format)
            customer_record = {
                'name': customer_data.get('customer_name'),
                'saved_date': datetime.now().isoformat(),
                **customer_data
            }
            
            return self.fs.save_customer(user_id, customer_record)
            
        except Exception as e:
            print(f"Error saving customer: {e}")
            return False
    
    def get_customer(self, customer_name: str) -> Optional[Dict]:
        """
        Get customer information by name.
        
        Args:
            customer_name: Name of the customer
            
        Returns:
            Dictionary containing customer information or None
        """
        try:
            # For backward compatibility, check default user first
            user_id = 'default_user'
            return self.fs.get_customer(user_id, customer_name)
        except Exception as e:
            print(f"Error getting customer: {e}")
            return None
    
    def get_all_customers(self) -> List[Dict]:
        """
        Get all saved customers.
        
        Returns:
            List of customer dictionaries
        """
        try:
            # For backward compatibility, get from default user
            user_id = 'default_user'
            return self.fs.get_user_customers(user_id)
        except Exception as e:
            print(f"Error getting customers: {e}")
            return []
    
    def search_customers(self, search_term: str) -> List[Dict]:
        """
        Search customers by name or other fields.
        
        Args:
            search_term: Search term
            
        Returns:
            List of matching customer dictionaries
        """
        try:
            # For backward compatibility, search in default user
            user_id = 'default_user'
            return self.fs.search_customers(user_id, search_term)
        except Exception as e:
            print(f"Error searching customers: {e}")
            return []
    
    def delete_customer(self, customer_name: str) -> bool:
        """
        Delete a saved customer.
        
        Args:
            customer_name: Name of the customer to delete
            
        Returns:
            Boolean indicating success
        """
        try:
            # For backward compatibility, delete from default user
            user_id = 'default_user'
            doc_id = f"{user_id}_{customer_name.lower()}"
            return self.fs.delete_chat_session(doc_id)  # Reuse delete method
        except Exception as e:
            print(f"Error deleting customer: {e}")
            return False
    
    def cleanup_old_sessions(self, hours: int = 24):
        """
        Clean up old inactive sessions.
        
        Args:
            hours: Hours after which to consider a session old
        """
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Clean memory (maintains original behavior)
        sessions_to_remove = []
        for session_id, session_data in self.active_sessions.items():
            last_updated_str = session_data.get('last_updated')
            if last_updated_str:
                try:
                    last_updated = datetime.fromisoformat(last_updated_str)
                    if last_updated < cutoff_time:
                        sessions_to_remove.append(session_id)
                except ValueError:
                    # Invalid date format, remove it
                    sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            del self.active_sessions[session_id]
        
        # Clean Firestore
        return self.fs.cleanup_old_sessions(hours)
    
    def get_session_stats(self) -> Dict:
        """
        Get statistics about current sessions.
        
        Returns:
            Dictionary with session statistics
        """
        active_count = len(self.active_sessions)
        
        # Count sessions by flow type (maintains original logic)
        quotation_sessions = 0
        po_sessions = 0
        
        for session_data in self.active_sessions.values():
            flow_type = session_data.get('flow_type')
            if flow_type == 'quotation':
                quotation_sessions += 1
            elif flow_type == 'purchase_order':
                po_sessions += 1
        
        customers_count = len(self.get_all_customers())
        
        return {
            'active_sessions': active_count,
            'quotation_sessions': quotation_sessions,
            'po_sessions': po_sessions,
            'saved_customers': customers_count
        }
    
    def _should_persist_state(self, state: Dict) -> bool:
        """
        Determine if a session state should be persisted to disk.
        
        Args:
            state: Session state dictionary
            
        Returns:
            Boolean indicating if state should be persisted
        """
        # Maintain original logic
        return (
            state.get('flow_type') and
            state.get('document_data') and
            len(state.get('document_data', {})) > 1
        )
    
    def export_customer_data(self) -> str:
        """
        Export customer data to JSON string for backup.
        
        Returns:
            JSON string of customer data
        """
        import json
        customers = self.get_all_customers()
        customers_dict = {}
        for customer in customers:
            name = customer.get('name', '').lower()
            if name:
                customers_dict[name] = customer
        
        return json.dumps(customers_dict, indent=2, ensure_ascii=False)
    
    # Additional methods for user-specific operations
    def save_customer_for_user(self, user_id: str, customer_data: Dict) -> bool:
        """Save customer for a specific user."""
        try:
            customer_name = customer_data.get('customer_name', '').lower()
            if not customer_name:
                return False
            
            customer_record = {
                'name': customer_data.get('customer_name'),
                'saved_date': datetime.now().isoformat(),
                **customer_data
            }
            
            return self.fs.save_customer(user_id, customer_record)
        except Exception as e:
            print(f"Error saving customer for user: {e}")
            return False
    
    def get_user_customers(self, user_id: str) -> List[Dict]:
        """Get customers for a specific user."""
        return self.fs.get_user_customers(user_id)
    
    def search_user_customers(self, user_id: str, search_term: str) -> List[Dict]:
        """Search customers for a specific user."""
        return self.fs.search_customers(user_id, search_term) 