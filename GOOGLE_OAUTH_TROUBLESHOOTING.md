# Google OAuth Troubleshooting Guide

## Current Error: "Google authentication failed. Please try again."

This error indicates that the OAuth flow is starting but failing during the callback process. Here's how to fix it:

## 🔍 **Step 1: Verify Google Cloud Console Settings**

### Check OAuth Consent Screen:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **"APIs & Services" → "OAuth consent screen"**
4. Ensure these settings:
   - **App name**: `AIBA - AI Business Assistant`
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - **Scopes**: Add `openid`, `profile`, `email`
   - **Test users**: Add your email address

### Check OAuth 2.0 Client IDs:
1. Go to **"APIs & Services" → "Credentials"**
2. Click on your OAuth 2.0 Client ID
3. Verify these settings:
   - **Application type**: Web application
   - **Authorized JavaScript origins**: 
     ```
     http://127.0.0.1:5000
     http://localhost:5000
     ```
   - **Authorized redirect URIs**:
     ```
     http://127.0.0.1:5000/auth/google/callback
     http://localhost:5000/auth/google/callback
     ```

## 🔍 **Step 2: Check API Enablement**

Enable these APIs in your Google Cloud project:
1. **Google+ API** (Legacy - but still needed)
2. **Google Identity and Access Management (IAM) API**
3. **Google Sign-In API**

To enable:
1. Go to **"APIs & Services" → "Library"**
2. Search for each API
3. Click "Enable"

## 🔍 **Step 3: Verify Your Current Setup**

Run this test in your terminal:
```bash
python -c "
from google_auth import google_auth_handler
from config import Config
print('=== Google OAuth Configuration ===')
print(f'Client ID: {Config.GOOGLE_CLIENT_ID[:30]}...')
print(f'Client Secret: {Config.GOOGLE_CLIENT_SECRET[:10]}...')
print(f'Redirect URI: {google_auth_handler.redirect_uri}')
print(f'Available: {google_auth_handler.is_available()}')
print('=====================================')
"
```

## 🔍 **Step 4: Test OAuth Flow**

1. Start your app: `python app.py`
2. Go to: `http://127.0.0.1:5000/auth/google/debug`
3. Check the debug output
4. Try Google sign-in and watch the Flask console

## 🔍 **Step 5: Common Issues & Solutions**

### Issue: "redirect_uri_mismatch"
**Solution**: Add exact URI to Google Console: `http://127.0.0.1:5000/auth/google/callback`

### Issue: "access_blocked"
**Solution**: Add your email to "Test users" in OAuth consent screen

### Issue: "invalid_client"
**Solution**: Double-check your Client ID and Secret

### Issue: "scope_not_authorized"
**Solution**: Add `openid`, `email`, `profile` scopes in OAuth consent screen

## 🔍 **Step 6: Manual Test URLs**

Test these URLs manually:

1. **Debug endpoint**: `http://127.0.0.1:5000/auth/google/debug`
2. **Start OAuth**: `http://127.0.0.1:5000/auth/google/login`
3. **Check auth status**: `http://127.0.0.1:5000/auth/check-auth`

## 🔍 **Step 7: Flask Console Output**

When you try to sign in, you should see:
```
OAuth flow started - State: abc123...
Redirect URL: https://accounts.google.com/o/oauth2/auth?...
Creating Google OAuth flow...
Successfully fetched Google provider configuration
Using Google discovery endpoints
OAuth flow created successfully
```

If you don't see this, check the specific error messages.

## 📋 **Quick Fixes**

### If Google Console is configured correctly:
1. Clear your browser cookies for `127.0.0.1`
2. Try in incognito/private mode
3. Try with a different Google account
4. Check if your Google account has 2FA enabled

### If still failing:
1. Use `localhost:5000` instead of `127.0.0.1:5000`
2. Add both URLs to Google Console authorized origins
3. Temporarily disable browser extensions

## 🆘 **Need More Help?**

Share these details:
1. Flask console output when trying to sign in
2. Browser developer tools console errors
3. Your Google Cloud Console OAuth consent screen status
4. The exact error message from Google (if any)

## ✅ **Expected Working Flow**

1. Click "Continue with Google"
2. Redirect to Google OAuth page
3. Sign in with Google account
4. Grant permissions to AIBA
5. Redirect back to AIBA
6. Automatic account creation/login
7. Redirect to main app or profile setup

---

**Current Configuration Status**: ✅ Credentials configured, debugging enabled 