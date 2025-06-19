import { auth, provider } from "./firebase-config.js";

import { createUserWithEmailAndPassword,
         signInWithEmailAndPassword,
         signInWithPopup,
         sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

/* == UI - Elements == */
const signInWithGoogleButtonEl = document.getElementById("sign-in-with-google-btn")
const signUpWithGoogleButtonEl = document.getElementById("sign-up-with-google-btn")
const emailInputEl = document.getElementById("email-input")
const passwordInputEl = document.getElementById("password-input")
const signInButtonEl = document.getElementById("sign-in-btn")
const createAccountButtonEl = document.getElementById("create-account-btn")
const emailForgotPasswordEl = document.getElementById("email-forgot-password")
const forgotPasswordButtonEl = document.getElementById("forgot-password-btn")

const errorMsgEmail = document.getElementById("email-error-message")
const errorMsgPassword = document.getElementById("password-error-message")
const errorMsgGoogleSignIn = document.getElementById("google-signin-error-message")

/* == UI - Event Listeners == */
if (signInWithGoogleButtonEl && signInButtonEl) {
    signInWithGoogleButtonEl.addEventListener("click", authSignInWithGoogle)
    signInButtonEl.addEventListener("click", authSignInWithEmail)
}

if (createAccountButtonEl) {
    createAccountButtonEl.addEventListener("click", authCreateAccountWithEmail)
}

if (signUpWithGoogleButtonEl) {
    signUpWithGoogleButtonEl.addEventListener("click", authSignUpWithGoogle)
}

if (forgotPasswordButtonEl) {
    forgotPasswordButtonEl.addEventListener("click", resetPassword)
}

/* === Main Code === */

/* = Functions - Firebase - Authentication = */

// Function to sign in with Google authentication
async function authSignInWithGoogle() {
    provider.setCustomParameters({
        'prompt': 'select_account'
    });

    try {
        const result = await signInWithPopup(auth, provider);

        if (!result || !result.user) {
            throw new Error('Authentication failed: No user data returned.');
        }

        const user = result.user;
        const email = user.email;

        if (!email) {
            throw new Error('Authentication failed: No email address returned.');
        }

        const idToken = await user.getIdToken();
        loginUser(user, idToken);

    } catch (error) {
        console.error('Error during sign-in with Google:', error);
        if (errorMsgGoogleSignIn) {
            errorMsgGoogleSignIn.textContent = 'Failed to sign in with Google. Please try again.';
        }
    }
}

// Function to create new account with Google auth
async function authSignUpWithGoogle() {
    provider.setCustomParameters({
        'prompt': 'select_account'
    });

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const email = user.email;

        const idToken = await user.getIdToken();
        loginUser(user, idToken);
    } catch (error) {
        console.error("Error during Google signup: ", error.message);
        if (errorMsgGoogleSignIn) {
            errorMsgGoogleSignIn.textContent = 'Failed to sign up with Google. Please try again.';
        }
    }
}

function authSignInWithEmail() {
    const email = emailInputEl.value
    const password = passwordInputEl.value

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            user.getIdToken().then(function(idToken) {
                loginUser(user, idToken)
            });

            console.log("User signed in: ", user)
        })
        .catch((error) => {
            const errorCode = error.code;
            console.error("Error code: ", errorCode)
            
            clearAuthFields()
            
            if (errorCode === "auth/invalid-email") {
                errorMsgEmail.textContent = "Invalid email"
            } else if (errorCode === "auth/invalid-credential") {
                errorMsgPassword.textContent = "Login failed - invalid email or password"
            } 
        });
}

function authCreateAccountWithEmail() {
    const email = emailInputEl.value
    const password = passwordInputEl.value

    createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;

            user.getIdToken().then(function(idToken) {
                loginUser(user, idToken)
            });

        })
        .catch((error) => {
            const errorCode = error.code;

            clearAuthFields()

            if (errorCode === "auth/invalid-email") {
                errorMsgEmail.textContent = "Invalid email"
            } else if (errorCode === "auth/weak-password") {
                errorMsgPassword.textContent = "Invalid password - must be at least 6 characters"
            } else if (errorCode === "auth/email-already-in-use") {
                errorMsgEmail.textContent = "An account already exists for this email."
            }
        });
}

function resetPassword() {
    const emailToReset = emailForgotPasswordEl.value

    clearInputField(emailForgotPasswordEl)

    sendPasswordResetEmail(auth, emailToReset)
    .then(() => {
        const resetFormView = document.getElementById("reset-password-view")
        const resetSuccessView = document.getElementById("reset-password-confirmation-page")

        if (resetFormView) resetFormView.style.display = "none"
        if (resetSuccessView) resetSuccessView.style.display = "block"

    })
    .catch((error) => {
        const errorCode = error.code;
        console.error("Password reset error:", errorCode);
    });
}

function loginUser(user, idToken) {
    console.log("Logging in user with token")
    
    fetch('/auth/firebase-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + idToken
        },
        body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email
        })
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/profile-setup';
        } else {
            console.error('Login failed');
            if (errorMsgGoogleSignIn) {
                errorMsgGoogleSignIn.textContent = 'Login failed. Please try again.';
            }
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        if (errorMsgGoogleSignIn) {
            errorMsgGoogleSignIn.textContent = 'Login failed. Please try again.';
        }
    });
}

function clearInputField(field) {
    field.value = ""
}

function clearAuthFields() {
    if (errorMsgEmail) errorMsgEmail.textContent = ""
    if (errorMsgPassword) errorMsgPassword.textContent = ""
    if (errorMsgGoogleSignIn) errorMsgGoogleSignIn.textContent = ""
} 