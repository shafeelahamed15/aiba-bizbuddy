"""
Chat Memory Module for AIBA Flask Application
Handles conversation state tracking and customer data storage.
"""

import json
import os
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta

class ChatMemory:
    def __init__(self):
        self.data_dir = 'data'
        self.sessions_file = os.path.join(self.data_dir, 'chat_sessions.json')
        self.customers_file = os.path.join(self.data_dir, 'saved_customers.json')
        
        # Ensure data directory exists
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Initialize files
        self._init_files()
        
        # In-memory session storage for active sessions
        self.active_sessions = {}
        
    def _init_files(self):
        """Initialize data files if they don't exist."""
        default_files = {
            self.sessions_file: {},
            self.customers_file: {}
        }
        
        for filepath, default_data in default_files.items():
            if not os.path.exists(filepath):
                self._save_json(filepath, default_data)
                
    def _load_json(self, filepath: str) -> Dict:
        """Load data from JSON file."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
            
    def _save_json(self, filepath: str, data: Dict):
        """Save data to JSON file."""
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving to {filepath}: {e}")
            
    def get_state(self, session_id: str) -> Dict:
        """
        Get current chat state for a session.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Dictionary containing session state
        """
        # First check in-memory storage
        if session_id in self.active_sessions:
            return self.active_sessions[session_id]
            
        # If not in memory, check persistent storage
        sessions = self._load_json(self.sessions_file)
        session_data = sessions.get(session_id, {})
        
        # Load into memory for faster access
        self.active_sessions[session_id] = session_data
        
        return session_data
        
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
        
        # Update in-memory storage
        self.active_sessions[session_id] = current_state
        
        # Persist to file (for important states)
        if self._should_persist_state(current_state):
            self._persist_session(session_id, current_state)
            
    def clear_state(self, session_id: str):
        """
        Clear chat state for a session.
        
        Args:
            session_id: Unique session identifier
        """
        # Clear from memory
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
            
        # Clear from persistent storage
        sessions = self._load_json(self.sessions_file)
        if session_id in sessions:
            del sessions[session_id]
            self._save_json(self.sessions_file, sessions)
            
    def save_customer(self, customer_data: Dict) -> bool:
        """
        Save customer information for future use.
        
        Args:
            customer_data: Dictionary containing customer information
            
        Returns:
            Boolean indicating success
        """
        try:
            customers = self._load_json(self.customers_file)
            
            customer_name = customer_data.get('customer_name', '').lower()
            if not customer_name:
                return False
                
            # Add metadata
            customer_record = {
                'name': customer_data.get('customer_name'),
                'saved_date': datetime.now().isoformat(),
                **customer_data
            }
            
            customers[customer_name] = customer_record
            self._save_json(self.customers_file, customers)
            
            return True
            
        except Exception as e:
            print(f"Error saving customer: {e}")
            return False
            
    def get_customer(self, customer_name: str) -> Optional[Dict]:
        """
        Get saved customer information.
        
        Args:
            customer_name: Name of the customer to retrieve
            
        Returns:
            Customer data dictionary or None if not found
        """
        customers = self._load_json(self.customers_file)
        return customers.get(customer_name.lower())
        
    def search_customers(self, search_term: str) -> List[Dict]:
        """
        Search for customers by name.
        
        Args:
            search_term: Term to search for
            
        Returns:
            List of matching customer records
        """
        customers = self._load_json(self.customers_file)
        search_term = search_term.lower()
        
        results = []
        for customer_data in customers.values():
            if search_term in customer_data.get('name', '').lower():
                results.append(customer_data)
                
        return results
        
    def get_all_customers(self) -> List[Dict]:
        """
        Get all saved customers.
        
        Returns:
            List of all customer records
        """
        customers = self._load_json(self.customers_file)
        return list(customers.values())
        
    def delete_customer(self, customer_name: str) -> bool:
        """
        Delete a saved customer.
        
        Args:
            customer_name: Name of the customer to delete
            
        Returns:
            Boolean indicating success
        """
        try:
            customers = self._load_json(self.customers_file)
            customer_key = customer_name.lower()
            
            if customer_key in customers:
                del customers[customer_key]
                self._save_json(self.customers_file, customers)
                return True
                
            return False
            
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
        
        # Clean memory
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
            
        # Clean persistent storage
        sessions = self._load_json(self.sessions_file)
        persistent_sessions_to_remove = []
        
        for session_id, session_data in sessions.items():
            last_updated_str = session_data.get('last_updated')
            if last_updated_str:
                try:
                    last_updated = datetime.fromisoformat(last_updated_str)
                    if last_updated < cutoff_time:
                        persistent_sessions_to_remove.append(session_id)
                except ValueError:
                    persistent_sessions_to_remove.append(session_id)
                    
        for session_id in persistent_sessions_to_remove:
            del sessions[session_id]
            
        if persistent_sessions_to_remove:
            self._save_json(self.sessions_file, sessions)
            
    def get_session_stats(self) -> Dict:
        """
        Get statistics about current sessions.
        
        Returns:
            Dictionary with session statistics
        """
        active_count = len(self.active_sessions)
        
        # Count sessions by flow type
        quotation_sessions = 0
        po_sessions = 0
        
        for session_data in self.active_sessions.values():
            flow_type = session_data.get('flow_type')
            if flow_type == 'quotation':
                quotation_sessions += 1
            elif flow_type == 'purchase_order':
                po_sessions += 1
                
        customers_count = len(self._load_json(self.customers_file))
        
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
        # Persist if we have significant data collected
        return (
            state.get('flow_type') and
            state.get('document_data') and
            len(state.get('document_data', {})) > 1
        )
        
    def _persist_session(self, session_id: str, state: Dict):
        """
        Persist session state to disk.
        
        Args:
            session_id: Unique session identifier
            state: Session state to persist
        """
        try:
            sessions = self._load_json(self.sessions_file)
            sessions[session_id] = state
            self._save_json(self.sessions_file, sessions)
        except Exception as e:
            print(f"Error persisting session {session_id}: {e}")
            
    def export_customer_data(self) -> str:
        """
        Export customer data to JSON string for backup.
        
        Returns:
            JSON string of customer data
        """
        customers = self._load_json(self.customers_file)
        return json.dumps(customers, indent=2, ensure_ascii=False)
        
    def import_customer_data(self, json_data: str) -> bool:
        """
        Import customer data from JSON string.
        
        Args:
            json_data: JSON string containing customer data
            
        Returns:
            Boolean indicating success
        """
        try:
            imported_customers = json.loads(json_data)
            
            # Validate data structure
            if not isinstance(imported_customers, dict):
                return False
                
            # Merge with existing data
            existing_customers = self._load_json(self.customers_file)
            existing_customers.update(imported_customers)
            
            self._save_json(self.customers_file, existing_customers)
            return True
            
        except (json.JSONDecodeError, Exception) as e:
            print(f"Error importing customer data: {e}")
            return False 