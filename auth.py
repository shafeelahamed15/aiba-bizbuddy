"""
Authentication Module for AIBA
Handles user registration, login, and session management.
"""

from flask import Blueprint, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
from datetime import datetime
import secrets
from functools import wraps
from google_auth import google_auth_handler

auth_bp = Blueprint('auth', __name__)

class AuthManager:
    def __init__(self):
        self.users_file = os.path.join('data', 'users.json')
        self.profiles_file = os.path.join('data', 'user_profiles.json')
        
        # Ensure data directory exists
        os.makedirs('data', exist_ok=True)
        
        # Initialize files
        self._init_files()
        
    def _init_files(self):
        """Initialize user data files."""
        default_files = {
            self.users_file: {},
            self.profiles_file: {}
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
            
    def _save_json(self, filepath: str, data: dict):
        """Save data to JSON file."""
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving to {filepath}: {e}")
            
    def register_user(self, email: str, password: str, name: str = None) -> dict:
        """Register a new user."""
        try:
            users = self._load_json(self.users_file)
            
            # Check if user already exists
            if email.lower() in users:
                return {
                    'success': False,
                    'message': 'User already exists with this email'
                }
            
            # Validate input
            if not email or not password:
                return {
                    'success': False,
                    'message': 'Email and password are required'
                }
                
            if len(password) < 6:
                return {
                    'success': False,
                    'message': 'Password must be at least 6 characters long'
                }
            
            # Create user
            user_id = secrets.token_urlsafe(16)
            password_hash = generate_password_hash(password)
            
            user_data = {
                'user_id': user_id,
                'email': email.lower(),
                'name': name or email.split('@')[0],
                'password_hash': password_hash,
                'auth_method': 'email',
                'created_at': datetime.now().isoformat(),
                'last_login': None,
                'profile_completed': False
            }
            
            users[email.lower()] = user_data
            self._save_json(self.users_file, users)
            
            return {
                'success': True,
                'message': 'User registered successfully',
                'user_id': user_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Registration failed: {str(e)}'
            }
    
    def register_google_user(self, google_user_info: dict) -> dict:
        """Register or login a user via Google OAuth."""
        try:
            users = self._load_json(self.users_file)
            email = google_user_info['email'].lower()
            
            # Check if user already exists
            if email in users:
                # Update existing user with Google info
                user_data = users[email]
                user_data['google_id'] = google_user_info['google_id']
                user_data['picture'] = google_user_info.get('picture', '')
                user_data['auth_method'] = 'google'
                user_data['last_login'] = datetime.now().isoformat()
                
                users[email] = user_data
                self._save_json(self.users_file, users)
                
                return {
                    'success': True,
                    'message': 'Google login successful',
                    'user': {
                        'user_id': user_data['user_id'],
                        'email': user_data['email'],
                        'name': user_data['name'],
                        'profile_completed': user_data.get('profile_completed', False),
                        'picture': user_data.get('picture', '')
                    }
                }
            else:
                # Create new user
                user_id = secrets.token_urlsafe(16)
                
                user_data = {
                    'user_id': user_id,
                    'email': email,
                    'name': google_user_info['name'],
                    'google_id': google_user_info['google_id'],
                    'picture': google_user_info.get('picture', ''),
                    'auth_method': 'google',
                    'email_verified': google_user_info.get('email_verified', False),
                    'created_at': datetime.now().isoformat(),
                    'last_login': datetime.now().isoformat(),
                    'profile_completed': False
                }
                
                users[email] = user_data
                self._save_json(self.users_file, users)
                
                return {
                    'success': True,
                    'message': 'Google registration successful',
                    'user': {
                        'user_id': user_data['user_id'],
                        'email': user_data['email'],
                        'name': user_data['name'],
                        'profile_completed': False,
                        'picture': user_data.get('picture', '')
                    }
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Google authentication failed: {str(e)}'
            }
            
    def login_user(self, email: str, password: str) -> dict:
        """Authenticate user login."""
        try:
            users = self._load_json(self.users_file)
            
            user_data = users.get(email.lower())
            if not user_data:
                return {
                    'success': False,
                    'message': 'Invalid email or password'
                }
            
            if not check_password_hash(user_data['password_hash'], password):
                return {
                    'success': False,
                    'message': 'Invalid email or password'
                }
            
            # Update last login
            user_data['last_login'] = datetime.now().isoformat()
            users[email.lower()] = user_data
            self._save_json(self.users_file, users)
            
            return {
                'success': True,
                'message': 'Login successful',
                'user': {
                    'user_id': user_data['user_id'],
                    'email': user_data['email'],
                    'name': user_data['name'],
                    'profile_completed': user_data.get('profile_completed', False),
                    'picture': user_data.get('picture', '')
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Login failed: {str(e)}'
            }
            
    def get_user_by_id(self, user_id: str) -> dict:
        """Get user data by user ID."""
        users = self._load_json(self.users_file)
        
        for user_data in users.values():
            if user_data.get('user_id') == user_id:
                return {
                    'user_id': user_data['user_id'],
                    'email': user_data['email'],
                    'name': user_data['name'],
                    'profile_completed': user_data.get('profile_completed', False),
                    'picture': user_data.get('picture', '')
                }
        
        return None
        
    def save_user_profile(self, user_id: str, profile_data: dict) -> dict:
        """Save or update user business profile."""
        try:
            profiles = self._load_json(self.profiles_file)
            users = self._load_json(self.users_file)
            
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
            
            # Save profile
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
            
            profiles[user_id] = profile_record
            self._save_json(self.profiles_file, profiles)
            
            # Mark profile as completed
            for email, user_data in users.items():
                if user_data.get('user_id') == user_id:
                    user_data['profile_completed'] = True
                    users[email] = user_data
                    break
            
            self._save_json(self.users_file, users)
            
            return {
                'success': True,
                'message': 'Profile saved successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Failed to save profile: {str(e)}'
            }
            
    def get_user_profile(self, user_id: str) -> dict:
        """Get user business profile."""
        profiles = self._load_json(self.profiles_file)
        return profiles.get(user_id)
        
    def update_user_profile(self, user_id: str, updates: dict) -> dict:
        """Update specific fields in user profile."""
        try:
            profiles = self._load_json(self.profiles_file)
            
            if user_id not in profiles:
                return {
                    'success': False,
                    'message': 'Profile not found'
                }
            
            profile = profiles[user_id]
            
            # Update business info
            if 'business_info' in updates:
                profile['business_info'].update(updates['business_info'])
            
            # Update bank info
            if 'bank_info' in updates:
                profile['bank_info'].update(updates['bank_info'])
            
            profile['updated_at'] = datetime.now().isoformat()
            
            profiles[user_id] = profile
            self._save_json(self.profiles_file, profiles)
            
            return {
                'success': True,
                'message': 'Profile updated successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Failed to update profile: {str(e)}'
            }

# Initialize auth manager
auth_manager = AuthManager()

def login_required(f):
    """Decorator to require login for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            # For HTML requests, redirect to auth page
            if request.content_type != 'application/json' and 'application/json' not in request.headers.get('Accept', ''):
                return redirect('/auth')
            # For API requests, return JSON
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'redirect': '/auth'
            }), 401
        return f(*args, **kwargs)
    return decorated_function

def profile_required(f):
    """Decorator to require completed profile for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            # For HTML requests, redirect to auth page
            if request.content_type != 'application/json' and 'application/json' not in request.headers.get('Accept', ''):
                return redirect('/auth')
            # For API requests, return JSON
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'redirect': '/auth'
            }), 401
            
        user_id = session['user_id']
        profile = auth_manager.get_user_profile(user_id)
        
        if not profile:
            # For HTML requests, redirect to profile setup
            if request.content_type != 'application/json' and 'application/json' not in request.headers.get('Accept', ''):
                return redirect('/profile-setup')
            # For API requests, return JSON
            return jsonify({
                'success': False,
                'message': 'Profile setup required',
                'redirect': '/profile-setup'
            }), 403
            
        return f(*args, **kwargs)
    return decorated_function

# Authentication Routes
@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user."""
    data = request.get_json()
    
    email = data.get('email', '').strip()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    
    result = auth_manager.register_user(email, password, name)
    
    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user."""
    data = request.get_json()
    
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    result = auth_manager.login_user(email, password)
    
    if result['success']:
        # Set session
        session['user_id'] = result['user']['user_id']
        session['email'] = result['user']['email']
        session['name'] = result['user']['name']
        
        return jsonify(result), 200
    else:
        return jsonify(result), 401

@auth_bp.route('/google/login')
def google_login():
    """Initiate Google OAuth login."""
    try:
        if not google_auth_handler.is_available():
            return redirect('/auth?error=google_not_configured')
            
        authorization_url, state = google_auth_handler.get_authorization_url()
        
        if not authorization_url:
            return redirect('/auth?error=google_service_error')
        
        # Store state in session for security
        session['oauth_state'] = state
        session.permanent = True
        
        print(f"OAuth flow started - State: {state[:10]}...")
        print(f"Redirect URL: {authorization_url}")
        
        return redirect(authorization_url)
        
    except Exception as e:
        print(f"Google login error: {e}")
        import traceback
        traceback.print_exc()
        return redirect('/auth?error=google_service_error')

@auth_bp.route('/google/debug')
def google_debug():
    """Debug endpoint for OAuth troubleshooting."""
    try:
        debug_info = {
            'google_available': google_auth_handler.is_available(),
            'client_id': google_auth_handler.client_id[:20] + '...' if google_auth_handler.client_id else 'None',
            'redirect_uri': google_auth_handler.redirect_uri,
            'session_state': session.get('oauth_state', 'None'),
            'session_keys': list(session.keys())
        }
        return jsonify(debug_info)
    except Exception as e:
        return jsonify({'error': str(e)})

@auth_bp.route('/google/callback')
def google_callback():
    """Handle Google OAuth callback."""
    try:
        if not google_auth_handler.is_available():
            return redirect('/auth?error=service_unavailable')
            
        # Get authorization code and state
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')
        
        # Check if user denied access
        if error:
            if error == 'access_denied':
                return redirect('/auth?error=access_denied')
            else:
                return redirect(f'/auth?error=oauth_error&message={error}')
        
        if not code:
            return redirect('/auth?error=no_code')
        
        # Verify state for security (but be more forgiving)
        session_state = session.get('oauth_state')
        if state and session_state and state != session_state:
            print(f"State mismatch: session={session_state[:10]}..., callback={state[:10]}...")
            # Clear the old state and try anyway (for development)
            session.pop('oauth_state', None)
            # return redirect('/auth?error=invalid_state')
        
        # Remove state from session
        session.pop('oauth_state', None)
        
        # Handle the callback and get user info
        google_user_info = google_auth_handler.handle_callback(code, state)
        
        if not google_user_info:
            return redirect('/auth?error=auth_failed')
        
        # Register or login the user
        result = auth_manager.register_google_user(google_user_info)
        
        if result['success']:
            # Set session
            session['user_id'] = result['user']['user_id']
            session['email'] = result['user']['email']
            session['name'] = result['user']['name']
            
            # Clear any error states
            session.permanent = True
            
            # Redirect based on profile completion
            if result['user']['profile_completed']:
                return redirect('/')
            else:
                return redirect('/profile-setup')
        else:
            return redirect(f'/auth?error=login_failed&message={result["message"]}')
            
    except Exception as e:
        print(f"Google callback error: {e}")
        import traceback
        traceback.print_exc()
        return redirect('/auth?error=server_error')

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout user."""
    session.clear()
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    }), 200

@auth_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """Get user profile."""
    user_id = session['user_id']
    profile = auth_manager.get_user_profile(user_id)
    
    if profile:
        return jsonify({
            'success': True,
            'profile': profile
        }), 200
    else:
        return jsonify({
            'success': False,
            'message': 'Profile not found'
        }), 404

@auth_bp.route('/profile', methods=['POST'])
@login_required
def save_profile():
    """Save user profile."""
    user_id = session['user_id']
    profile_data = request.get_json()
    
    result = auth_manager.save_user_profile(user_id, profile_data)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@auth_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    """Update user profile."""
    user_id = session['user_id']
    updates = request.get_json()
    
    result = auth_manager.update_user_profile(user_id, updates)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@auth_bp.route('/check-auth', methods=['GET'])
def check_auth():
    """Check if user is authenticated."""
    if 'user_id' in session:
        user_id = session['user_id']
        user = auth_manager.get_user_by_id(user_id)
        
        if user:
            return jsonify({
                'authenticated': True,
                'user': user
            }), 200
    
    return jsonify({
        'authenticated': False
    }), 200 