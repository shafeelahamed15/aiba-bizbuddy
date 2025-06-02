import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseconfig"; // adjust this path if your firebase config file is elsewhere

export const savePromptHistory = async (uid, userPrompt, structuredData) => {
  try {
    await addDoc(collection(db, "users", uid, "prompt_history"), {
      originalPrompt: userPrompt,
      structuredData: structuredData,
      createdAt: serverTimestamp(),
      resultStatus: "pdf_created",
    });
    console.log("✅ Prompt history saved");
  } catch (error) {
    console.error("❌ Failed to save prompt history:", error);
  }
}; 