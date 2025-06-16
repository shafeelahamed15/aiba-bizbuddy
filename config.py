"""
Configuration file for AIBA Application
Contains Google OAuth and other application settings.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    # Flask Configuration
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY') or 'aiba-secret-key-2024'
    
    # Google OAuth Configuration
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID') or 'your_google_client_id_here'
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET') or 'your_google_client_secret_here'
    
    # Application URL
    APP_URL = os.environ.get('APP_URL') or 'http://127.0.0.1:5000'
    
    # OAuth Settings
    GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
    
    @staticmethod
    def get_google_oauth_config():
        """Get Google OAuth configuration."""
        return {
            'client_id': Config.GOOGLE_CLIENT_ID,
            'client_secret': Config.GOOGLE_CLIENT_SECRET,
            'redirect_uri': f"{Config.APP_URL}/auth/google/callback",
            'scope': ['openid', 'email', 'profile']
        }
    
    @staticmethod
    def is_google_oauth_configured():
        """Check if Google OAuth is properly configured."""
        return bool(Config.GOOGLE_CLIENT_ID != 'your_google_client_id_here' and 
                   Config.GOOGLE_CLIENT_SECRET != 'your_google_client_secret_here' and
                   Config.GOOGLE_CLIENT_ID and Config.GOOGLE_CLIENT_SECRET) 