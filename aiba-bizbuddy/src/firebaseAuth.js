import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import app from "./firebaseconfig";

const auth = getAuth(app);
const db = getFirestore(app);

const createUserDocument = async (user) => {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    try {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  }
};

export const signUp = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await createUserDocument(userCredential.user);
  return userCredential;
};

export const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await createUserDocument(userCredential.user);
  return userCredential;
};
