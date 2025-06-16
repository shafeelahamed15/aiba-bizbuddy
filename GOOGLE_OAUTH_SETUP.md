# Google OAuth Setup Guide for AIBA

This guide will help you set up Google OAuth authentication for your AIBA application.

## 1. Google Cloud Console Setup

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `AIBA-Authentication`
4. Click "Create"

### Step 2: Enable Google+ API
1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API" 
3. Click on it and press "Enable"
4. Also enable "Google Identity and Access Management (IAM) API"

### Step 3: Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have a Google Workspace)
3. Fill in required information:
   - **App name**: `AIBA - AI Business Assistant`
   - **User support email**: Your email
   - **App logo**: Upload your company logo (optional)
   - **App domain**: `http://127.0.0.1:5000` (for development)
   - **Developer contact information**: Your email
4. Click "Save and Continue"
5. **Scopes**: Click "Add or Remove Scopes"
   - Add: `openid`, `profile`, `email`
   - Click "Save and Continue"
6. **Test users** (for development):
   - Add your email and any other test emails
   - Click "Save and Continue"

### Step 4: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Application type: "Web application"
4. Name: `AIBA Web Client`
5. **Authorized JavaScript origins**:
   - `http://127.0.0.1:5000`
   - `http://localhost:5000`
6. **Authorized redirect URIs**:
   - `http://127.0.0.1:5000/auth/google/callback`
   - `http://localhost:5000/auth/google/callback`
7. Click "Create"
8. **IMPORTANT**: Copy the Client ID and Client Secret

## 2. Application Configuration

### Option 1: Environment Variables (Recommended)
Create a `.env` file in your project root:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Flask Configuration
FLASK_SECRET_KEY=aiba-secret-key-2024

# Application Settings
APP_URL=http://127.0.0.1:5000
```

### Option 2: Direct Configuration
Edit `config.py` and replace the placeholder values:

```python
class Config:
    # Replace these with your actual Google OAuth credentials
    GOOGLE_CLIENT_ID = 'your_actual_client_id_here'
    GOOGLE_CLIENT_SECRET = 'your_actual_client_secret_here'
    
    # Other settings...
```

## 3. Testing the Setup

### Step 1: Start the Application
```bash
python app.py
```

### Step 2: Test Google Authentication
1. Go to `http://127.0.0.1:5000/auth`
2. Click "Continue with Google" or "Sign up with Google"
3. You should be redirected to Google's OAuth page
4. Sign in with your Google account
5. Grant permissions to the app
6. You should be redirected back to AIBA

### Step 3: Verify User Creation
- Check the `data/users.json` file
- Your Google account should be listed with `auth_method: 'google'`

## 4. Production Setup

### For Production Deployment:
1. **Update OAuth Consent Screen**:
   - Change status from "Testing" to "In production"
   - Add your production domain

2. **Update Authorized URIs**:
   - Add your production domain to authorized origins
   - Add production callback URL: `https://yourdomain.com/auth/google/callback`

3. **Environment Variables**:
   - Set `APP_URL=https://yourdomain.com`
   - Update other production settings

4. **Security Considerations**:
   - Use HTTPS in production
   - Keep client secret secure
   - Implement proper session security

## 5. Troubleshooting

### Common Issues:

#### "Error 400: redirect_uri_mismatch"
- **Solution**: Make sure the redirect URI in Google Console exactly matches your callback URL
- Check for trailing slashes, http vs https, etc.

#### "Error 403: access_blocked"
- **Solution**: Make sure your email is added as a test user in OAuth consent screen
- Or publish your app for production use

#### "Error: OAuth state mismatch"
- **Solution**: Clear browser cookies and try again
- Check if sessions are working properly

#### Google Sign In button not working
- **Solution**: Check browser console for JavaScript errors
- Verify Google APIs are loading properly

### Debug Steps:
1. Check Flask console for error messages
2. Verify `config.py` has correct client ID/secret
3. Test with `curl` to check OAuth endpoints
4. Enable debug mode: `app.run(debug=True)`

## 6. Features Enabled

With Google OAuth setup, users can:
- ✅ Sign in with Google account
- ✅ Sign up with Google account  
- ✅ Automatic user profile creation
- ✅ Seamless authentication flow
- ✅ Profile picture from Google account
- ✅ Email verification (from Google)

## 7. File Structure

```
aiba-python-chatbot/
├── config.py                 # Configuration with OAuth settings
├── google_auth.py            # Google OAuth handler
├── auth.py                   # Authentication routes and logic
├── app.py                    # Main application with OAuth integration
├── templates/
│   └── auth.html            # Login page with Google button
├── static/
│   └── auth.css             # Styling for Google button
└── data/
    └── users.json           # User storage (includes Google users)
```

## 8. Next Steps

After successful Google OAuth setup:
1. Test with multiple Google accounts
2. Configure email notifications (optional)
3. Add social profile features
4. Implement Google Drive integration (future)
5. Add Google Calendar integration (future)

---

**Need Help?** Check the [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2) for more details. 