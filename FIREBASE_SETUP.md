# Firebase Authentication Setup for AIBA

## Overview
Your AIBA application now uses Firebase Authentication for secure user management. This provides both email/password and Google sign-in capabilities through a single, unified system.

## Prerequisites
1. A Google/Firebase account
2. A Firebase project

## Setup Instructions

### 1. Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### 2. Enable Authentication
1. In your Firebase project, go to **Authentication** → **Sign-in method**
2. Enable the following providers:
   - **Email/Password**: Click and enable
   - **Google**: Click, enable, and configure with your project details

### 3. Configure Web App
1. Go to **Project Settings** (gear icon) → **General** tab
2. In "Your apps" section, click **Add app** → **Web** (</>) 
3. Register your app with a nickname (e.g., "AIBA Web")
4. Copy the `firebaseConfig` object

### 4. Update Configuration Files

#### Update `firebase_config.py`:
```python
firebaseConfig = {
    "apiKey": "your-api-key-here",
    "authDomain": "your-project.firebaseapp.com",
    "projectId": "your-project-id",
    "storageBucket": "your-project.appspot.com",
    "messagingSenderId": "123456789",
    "appId": "your-app-id"
}
```

#### Update `static/firebase-config.js`:
```javascript
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 5. Set Up Firebase Admin SDK
1. Go to **Project Settings** → **Service accounts** tab
2. Click **Generate new private key** under "Firebase Admin SDK"
3. Download the JSON file
4. Rename it to `firebase-auth.json` and place it in your project root directory

### 6. Configure Authorized Domains
1. In Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Add your domains:
   - `localhost` (for development)
   - Your production domain (when deploying)

### 7. Update Environment Variables
Create or update your `.env` file:
```
SECRET_KEY=your-secret-key-here
```

## Features Enabled

✅ **Email/Password Authentication**
- User registration with email and password
- Login with email and password  
- Password reset functionality

✅ **Google Sign-In**
- One-click Google authentication
- Automatic account creation/linking

✅ **Security Features**
- Token-based authentication
- Secure session management
- Protected routes

## Usage

### Access Points
- **Login**: `/login`
- **Sign Up**: `/signup` 
- **Main App**: `/` (requires authentication)
- **Profile Setup**: `/profile-setup`

### Authentication Flow
1. Users visit `/login` or `/signup`
2. They can authenticate via:
   - Email/password form
   - Google sign-in button
3. Upon successful authentication:
   - New users → Profile setup
   - Existing users → Main application

## Development Notes

- The old Google OAuth system has been completely removed
- Firebase handles both email and Google authentication
- User data is still stored locally in JSON files
- The system is backwards compatible with existing user profiles

## Troubleshooting

### Common Issues:
1. **"Firebase not initialized"**: Check if `firebase-auth.json` file is present
2. **"Invalid configuration"**: Verify firebaseConfig in both Python and JS files
3. **"Auth domain not authorized"**: Add your domain to Firebase authorized domains
4. **Google sign-in not working**: Ensure Google provider is enabled in Firebase Console

### Testing
1. Start your Flask app: `python app.py`
2. Visit `http://localhost:5000/login`
3. Test both email and Google authentication

## Security Best Practices

- Keep `firebase-auth.json` secure and never commit to version control
- Use environment variables for sensitive configuration
- Regularly rotate your Firebase project keys
- Monitor authentication logs in Firebase Console

Your AIBA application now has a modern, secure authentication system powered by Firebase! 🚀 