"""
Chat Memory Module for AIBA Flask Application
Handles conversation state tracking and customer data storage.
Now using Firestore for scalable storage.
"""

import json
import os
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
from chat_memory_firestore import ChatMemoryFirestore

class ChatMemory:
    def __init__(self):
        """Initialize ChatMemory with Firestore backend."""
        self.firestore_memory = ChatMemoryFirestore()
        
    def get_state(self, session_id: str) -> Dict:
        """Get current chat state for a session."""
        return self.firestore_memory.get_state(session_id)
        
    def update_state(self, session_id: str, state_updates: Dict):
        """Update chat state for a session."""
        self.firestore_memory.update_state(session_id, state_updates)
            
    def clear_state(self, session_id: str):
        """Clear chat state for a session."""
        self.firestore_memory.clear_state(session_id)
            
    def save_customer(self, customer_data: Dict) -> bool:
        """Save customer information for future use."""
        return self.firestore_memory.save_customer(customer_data)
            
    def get_customer(self, customer_name: str) -> Optional[Dict]:
        """Get saved customer information."""
        return self.firestore_memory.get_customer(customer_name)
        
    def search_customers(self, search_term: str) -> List[Dict]:
        """Search for customers by name."""
        return self.firestore_memory.search_customers(search_term)
        
    def get_all_customers(self) -> List[Dict]:
        """Get all saved customers."""
        return self.firestore_memory.get_all_customers()
        
    def delete_customer(self, customer_name: str) -> bool:
        """Delete a saved customer."""
        return self.firestore_memory.delete_customer(customer_name)
            
    def cleanup_old_sessions(self, hours: int = 24):
        """Clean up old inactive sessions."""
        return self.firestore_memory.cleanup_old_sessions(hours)
        
    def get_session_stats(self) -> Dict:
        """Get statistics about current sessions."""
        return self.firestore_memory.get_session_stats()
        
    def export_customer_data(self) -> str:
        """Export customer data to JSON string for backup."""
        return self.firestore_memory.export_customer_data()
        
    def import_customer_data(self, json_data: str) -> bool:
        """Import customer data from JSON string."""
        try:
            imported_customers = json.loads(json_data)
            
            # Validate data structure
            if not isinstance(imported_customers, dict):
                return False
            
            # Import each customer individually
            success_count = 0
            for customer_name, customer_data in imported_customers.items():
                if self.save_customer(customer_data):
                    success_count += 1
            
            return success_count > 0
            
        except Exception as e:
            print(f"Error importing customer data: {e}")
            return False
    
    # Additional methods for user-specific operations
    def save_customer_for_user(self, user_id: str, customer_data: Dict) -> bool:
        """Save customer for a specific user."""
        return self.firestore_memory.save_customer_for_user(user_id, customer_data)
    
    def get_user_customers(self, user_id: str) -> List[Dict]:
        """Get customers for a specific user."""
        return self.firestore_memory.get_user_customers(user_id)
    
    def search_user_customers(self, user_id: str, search_term: str) -> List[Dict]:
        """Search customers for a specific user."""
        return self.firestore_memory.search_user_customers(user_id, search_term) 