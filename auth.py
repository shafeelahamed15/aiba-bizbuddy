"""
Authentication Module for AIBA
Handles user registration, login, and session management with Firebase Authentication.
Now using Firestore for scalable data storage.
"""

from flask import Blueprint, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
from datetime import datetime
import secrets
from functools import wraps
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from firebase_config import firebaseConfig
from auth_firestore import AuthManagerFirestore

auth_bp = Blueprint('auth', __name__)

# Initialize Firebase Admin SDK
try:
    # Try to initialize Firebase app if not already initialized
    if not firebase_admin._apps:
        # You need to place your Firebase service account JSON file as 'firebase-auth.json'
        cred = credentials.Certificate("firebase-auth.json")
        firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"Firebase initialization error: {e}")
    print("Please add your Firebase service account JSON file as 'firebase-auth.json'")

# Use Firestore AuthManager - delegate all calls to maintain exact same interface
class AuthManager:
    def __init__(self):
        self.firestore_auth = AuthManagerFirestore()
        
    def register_firebase_user(self, firebase_uid: str, email: str, name: str = None) -> dict:
        """Register or login a user via Firebase Authentication."""
        return self.firestore_auth.register_firebase_user(firebase_uid, email, name)
            
    def get_user_by_id(self, user_id: str) -> dict:
        """Get user data by user ID."""
        return self.firestore_auth.get_user_by_id(user_id)
        
    def save_user_profile(self, user_id: str, profile_data: dict) -> dict:
        """Save or update user business profile."""
        return self.firestore_auth.save_user_profile(user_id, profile_data)
            
    def get_user_profile(self, user_id: str) -> dict:
        """Get user business profile."""
        return self.firestore_auth.get_user_profile(user_id)
        
    def update_user_profile(self, user_id: str, updates: dict) -> dict:
        """Update specific fields in user profile."""
        return self.firestore_auth.update_user_profile(user_id, updates)

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

# Authentication Routes (Firebase only)

@auth_bp.route('/firebase-login', methods=['POST'])
def firebase_login():
    """Handle Firebase authentication."""
    try:
        # Get the ID token from the request
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401
        
        id_token = auth_header.split('Bearer ')[1]
        
        # Verify the ID token
        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
        except firebase_auth.InvalidIdTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        except firebase_auth.ExpiredIdTokenError:
            return jsonify({'error': 'Token expired'}), 401
        except Exception as e:
            return jsonify({'error': f'Token verification failed: {str(e)}'}), 401
        
        # Get user data from the request body
        request_data = request.get_json() or {}
        
        # Extract user information
        firebase_uid = decoded_token['uid']
        email = decoded_token.get('email', request_data.get('email'))
        name = request_data.get('displayName')
        
        # Register/login user with new method signature
        result = auth_manager.register_firebase_user(firebase_uid, email, name)
        
        if result['success']:
            # Set session
            session['user_id'] = result['user_id']
            session['email'] = email
            session['name'] = name or email.split('@')[0]
            session['auth_method'] = 'firebase'
            session.permanent = True
            
            return jsonify({
                'success': True,
                'message': result['message'],
                'user': {
                    'user_id': result['user_id'],
                    'email': email,
                    'name': name or email.split('@')[0],
                    'profile_completed': result['profile_completed']
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        print(f"Firebase login error: {e}")
        return jsonify({
            'success': False,
            'message': f'Authentication failed: {str(e)}'
        }), 500

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