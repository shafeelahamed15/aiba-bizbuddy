"""
Google OAuth Authentication Handler for AIBA
Handles Google Sign In/Sign Up integration.
"""

import json
import secrets

try:
    import requests
    from flask import Flask, session, request, redirect, url_for
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token
    from google_auth_oauthlib.flow import Flow
    from config import Config
    GOOGLE_AVAILABLE = True
    print("Google OAuth libraries loaded successfully")
except ImportError as e:
    print(f"Google OAuth libraries not available: {e}")
    GOOGLE_AVAILABLE = False
    # Create dummy classes for development
    class Flow:
        @classmethod
        def from_client_config(cls, *args, **kwargs):
            return None
    
    class google_requests:
        class Request:
            pass
    
    def id_token(*args, **kwargs):
        pass

class GoogleAuthHandler:
    def __init__(self):
        if not GOOGLE_AVAILABLE:
            print("Warning: Google OAuth not available. Google sign-in will be disabled.")
            return
            
        try:
            from config import Config
            self.client_id = Config.GOOGLE_CLIENT_ID
            self.client_secret = Config.GOOGLE_CLIENT_SECRET
            self.redirect_uri = f"{Config.APP_URL}/auth/google/callback"
        except ImportError:
            print("Warning: Config not available, using defaults")
            self.client_id = "not_configured"
            self.client_secret = "not_configured" 
            self.redirect_uri = "http://127.0.0.1:5000/auth/google/callback"
        
    def is_available(self):
        """Check if Google OAuth is available."""
        if not GOOGLE_AVAILABLE:
            return False
            
        try:
            from config import Config
            return Config.is_google_oauth_configured()
        except:
            return self.client_id != "not_configured" and self.client_id != "your_google_client_id_here"
        
    def get_google_provider_cfg(self):
        """Get Google OAuth provider configuration."""
        if not self.is_available():
            return None
            
        try:
            import requests
            # Use a more reliable approach with explicit headers and timeout
            headers = {
                'User-Agent': 'AIBA-OAuth-Client/1.0',
                'Accept': 'application/json'
            }
            response = requests.get(
                "https://accounts.google.com/.well-known/openid-configuration",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            
            if response.status_code == 200 and response.text.strip():
                print("Successfully fetched Google provider configuration")
                return response.json()
            else:
                print(f"Invalid response from Google: Status {response.status_code}, Content: {response.text[:100]}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"Network error fetching Google provider config: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"JSON decode error from Google provider config: {e}")
            print(f"Response content: {response.text[:200] if 'response' in locals() else 'No response'}")
            return None
        except Exception as e:
            print(f"Error fetching Google provider config: {e}")
            return None
    
    def create_flow(self):
        """Create Google OAuth flow."""
        if not self.is_available():
            print("Google OAuth not available for flow creation")
            return None
            
        try:
            print("Creating Google OAuth flow...")
            
            # Try to get provider config, but fall back to hardcoded values if needed
            google_provider_cfg = self.get_google_provider_cfg()
            
            if not google_provider_cfg:
                print("Using fallback Google OAuth endpoints")
                # Use hardcoded Google OAuth endpoints as fallback
                google_provider_cfg = {
                    "authorization_endpoint": "https://accounts.google.com/o/oauth2/auth",
                    "token_endpoint": "https://oauth2.googleapis.com/token"
                }
            else:
                print("Using Google discovery endpoints")
                
            print(f"Auth URI: {google_provider_cfg['authorization_endpoint']}")
            print(f"Token URI: {google_provider_cfg['token_endpoint']}")
            print(f"Redirect URI: {self.redirect_uri}")
                
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "auth_uri": google_provider_cfg["authorization_endpoint"],
                        "token_uri": google_provider_cfg["token_endpoint"],
                        "redirect_uris": [self.redirect_uri],
                    }
                },
                scopes=["openid", "email", "profile"],
            )
            
            flow.redirect_uri = self.redirect_uri
            print("OAuth flow created successfully")
            return flow
            
        except Exception as e:
            print(f"Error creating Google OAuth flow: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_authorization_url(self):
        """Get Google OAuth authorization URL."""
        if not self.is_available():
            return None, None
            
        try:
            flow = self.create_flow()
            if not flow:
                return None, None
                
            # Generate a more robust state parameter
            state = secrets.token_urlsafe(32)
            
            authorization_url, _ = flow.authorization_url(
                access_type="offline",
                include_granted_scopes="true",
                state=state,
                prompt="select_account"  # Always show account selection
            )
            
            return authorization_url, state
            
        except Exception as e:
            print(f"Error getting authorization URL: {e}")
            return None, None
    
    def handle_callback(self, authorization_code, state):
        """Handle Google OAuth callback."""
        if not self.is_available():
            print("Google OAuth not available")
            return None
            
        try:
            print(f"Handling callback with code: {authorization_code[:20]}... and state: {state[:10]}...")
            
            flow = self.create_flow()
            if not flow:
                print("Failed to create OAuth flow")
                return None
                
            print("Created OAuth flow successfully")
            
            # Fetch token
            print("Fetching token...")
            flow.fetch_token(code=authorization_code)
            print("Token fetched successfully")
            
            # Get user info from ID token
            credentials = flow.credentials
            print(f"Got credentials: {type(credentials)}")
            
            request_session = google_requests.Request()
            
            print("Verifying ID token...")
            id_info = id_token.verify_oauth2_token(
                credentials.id_token,
                request_session,
                self.client_id
            )
            print(f"ID token verified successfully: {id_info.get('email', 'No email')}")
            
            # Extract user information
            user_info = {
                'google_id': id_info.get('sub'),
                'email': id_info.get('email'),
                'name': id_info.get('name'),
                'picture': id_info.get('picture'),
                'email_verified': id_info.get('email_verified', False)
            }
            
            print(f"Extracted user info: {user_info['email']} - {user_info['name']}")
            return user_info
            
        except Exception as e:
            print(f"Error handling Google OAuth callback: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def verify_google_token(self, token):
        """Verify Google ID token."""
        if not self.is_available():
            return None
            
        try:
            request_session = google_requests.Request()
            id_info = id_token.verify_oauth2_token(
                token,
                request_session,
                self.client_id
            )
            
            return {
                'google_id': id_info.get('sub'),
                'email': id_info.get('email'),
                'name': id_info.get('name'),
                'picture': id_info.get('picture'),
                'email_verified': id_info.get('email_verified', False)
            }
            
        except Exception as e:
            print(f"Error verifying Google token: {e}")
            return None

# Initialize Google Auth Handler
google_auth_handler = GoogleAuthHandler()

# Print status
if google_auth_handler.is_available():
    print("✅ Google OAuth handler initialized successfully")
else:
    print("⚠️ Google OAuth handler initialized but not configured or libraries missing") 