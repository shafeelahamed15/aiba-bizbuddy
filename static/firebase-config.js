import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, 
         GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Your web app's Firebase configuration
// Add your Firebase configuration details here
const firebaseConfig = {
        apiKey: "AIzaSyBlLtvOV1yQ9JYDWecLpU2RdqpQfoC7pyk",
        authDomain: "aiba-web.firebaseapp.com",
        projectId: "aiba-web",
        storageBucket: "aiba-web.firebasestorage.app",
        messagingSenderId: "652427612120",
        appId: "1:652427612120:web:eccebb451118e2a02eacad",
        measurementId: "G-GLH4QZRS1X"
      };


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const db = getFirestore(app);

export { auth, provider, db }; 