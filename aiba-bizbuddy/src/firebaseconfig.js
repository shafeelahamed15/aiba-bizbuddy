// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBlLtvOV1yQ9JYDWecLpU2RdqpQfoC7pyk",
    authDomain: "aiba-web.firebaseapp.com",
    projectId: "aiba-web",
    storageBucket: "aiba-web.firebasestorage.app",
    messagingSenderId: "652427612120",
    appId: "1:652427612120:web:bc22c6cf104f89e62eacad",
    measurementId: "G-S4THQQNSBT"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
