"""
Updated AuthManager using Firestore instead of JSON files
Maintains exact same interface as original AuthManager
"""

from firestore_service import firestore_service
from datetime import datetime
import secrets

class AuthManagerFirestore:
    def __init__(self):
        self.fs = firestore_service
    
    def register_firebase_user(self, firebase_uid: str, email: str, name: str = None) -> dict:
        """Register Firebase user in Firestore."""
        try:
            # Check if user already exists
            existing_user = self.fs.get_user(email)
            if existing_user:
                # Update last login
                self.fs.update_user(email, {'last_login': datetime.now().isoformat()})
                return {
                    'success': True,
                    'message': 'User logged in successfully',
                    'user_id': existing_user['user_id'],
                    'profile_completed': existing_user.get('profile_completed', False)
                }
            
            # Create new user
            user_id = secrets.token_urlsafe(16)
            user_data = {
                'user_id': user_id,
                'email': email,
                'name': name or email.split('@')[0],
                'firebase_uid': firebase_uid,
                'auth_method': 'firebase',
                'email_verified': True,
                'created_at': datetime.now().isoformat(),
                'last_login': datetime.now().isoformat(),
                'profile_completed': False
            }
            
            if self.fs.save_user(email, user_data):
                return {
                    'success': True,
                    'message': 'User registered successfully',
                    'user_id': user_id,
                    'profile_completed': False
                }
            else:
                return {
                    'success': False,
                    'message': 'Failed to save user data'
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Registration failed: {str(e)}'
            }
    
    def get_user_by_id(self, user_id: str) -> dict:
        """Get user data by user ID."""
        user_data = self.fs.get_user_by_id(user_id)
        if user_data:
            return {
                'user_id': user_data['user_id'],
                'email': user_data['email'],
                'name': user_data['name'],
                'profile_completed': user_data.get('profile_completed', False),
                'picture': user_data.get('picture', '')
            }
        return None
    
    def save_user_profile(self, user_id: str, profile_data: dict) -> dict:
        """Save user business profile to Firestore."""
        try:
            # Validate required fields
            required_fields = [
                'business_name', 'address', 'email', 'phone',
                'account_name', 'account_number', 'bank_name', 'ifsc_code'
            ]
            
            missing_fields = [field for field in required_fields if not profile_data.get(field)]
            
            if missing_fields:
                return {
                    'success': False,
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }
            
            # Prepare profile data in exact same format as original
            profile_record = {
                'user_id': user_id,
                'business_info': {
                    'business_name': profile_data.get('business_name'),
                    'address': profile_data.get('address'),
                    'gstin': profile_data.get('gstin'),
                    'state': profile_data.get('state'),
                    'country': profile_data.get('country', 'India'),
                    'pincode': profile_data.get('pincode'),
                    'email': profile_data.get('email'),
                    'phone': profile_data.get('phone'),
                    'website': profile_data.get('website', '')
                },
                'bank_info': {
                    'account_name': profile_data.get('account_name'),
                    'account_number': profile_data.get('account_number'),
                    'bank_name': profile_data.get('bank_name'),
                    'ifsc_code': profile_data.get('ifsc_code'),
                    'branch': profile_data.get('branch', '')
                },
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            # Save to Firestore
            if self.fs.save_user_profile(user_id, profile_record):
                # Mark profile as completed
                user_data = self.fs.get_user_by_id(user_id)
                if user_data:
                    email = user_data['email']
                    self.fs.update_user(email, {'profile_completed': True})
                
                return {
                    'success': True,
                    'message': 'Profile saved successfully'
                }
            else:
                return {
                    'success': False,
                    'message': 'Failed to save profile'
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Failed to save profile: {str(e)}'
            }
    
    def get_user_profile(self, user_id: str) -> dict:
        """Get user business profile from Firestore."""
        return self.fs.get_user_profile(user_id)
    
    def update_user_profile(self, user_id: str, updates: dict) -> dict:
        """Update user profile in Firestore."""
        try:
            profile = self.fs.get_user_profile(user_id)
            if not profile:
                return {
                    'success': False,
                    'message': 'Profile not found'
                }
            
            # Update business info
            if 'business_info' in updates:
                if 'business_info' not in profile:
                    profile['business_info'] = {}
                profile['business_info'].update(updates['business_info'])
            
            # Update bank info
            if 'bank_info' in updates:
                if 'bank_info' not in profile:
                    profile['bank_info'] = {}
                profile['bank_info'].update(updates['bank_info'])
            
            profile['updated_at'] = datetime.now().isoformat()
            
            if self.fs.update_user_profile(user_id, profile):
                return {
                    'success': True,
                    'message': 'Profile updated successfully'
                }
            else:
                return {
                    'success': False,
                    'message': 'Failed to update profile'
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Failed to update profile: {str(e)}'
            } 