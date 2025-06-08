import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import app from "../firebaseconfig";

const db = getFirestore(app);

/**
 * Get business profile for the current user
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Business profile data or null
 */
export const getBusinessProfile = async (userId) => {
  try {
    const docRef = doc(db, "users", userId, "business", "info");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log("✅ Business profile fetched:", docSnap.data());
      return docSnap.data();
    } else {
      console.log("❌ No business profile found for user:", userId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching business profile:", error);
    throw error;
  }
};

/**
 * Update business profile for the current user
 * @param {string} userId - User ID
 * @param {object} updatedData - Updated business profile data
 * @returns {Promise<boolean>} Success status
 */
export const updateBusinessProfile = async (userId, updatedData) => {
  try {
    const docRef = doc(db, "users", userId, "business", "info");
    
    // Add timestamp for when the profile was last updated
    const dataWithTimestamp = {
      ...updatedData,
      lastUpdated: new Date().toISOString(),
      updatedBy: userId
    };
    
    await updateDoc(docRef, dataWithTimestamp);
    console.log("✅ Business profile updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating business profile:", error);
    throw error;
  }
};

/**
 * Create initial business profile for new user
 * @param {string} userId - User ID
 * @param {object} businessData - Initial business profile data
 * @returns {Promise<boolean>} Success status
 */
export const createBusinessProfile = async (userId, businessData) => {
  try {
    const docRef = doc(db, "users", userId, "business", "info");
    
    const profileData = {
      ...businessData,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      lastUpdated: new Date().toISOString()
    };
    
    await setDoc(docRef, profileData);
    console.log("✅ Business profile created successfully");
    return true;
  } catch (error) {
    console.error("Error creating business profile:", error);
    throw error;
  }
};

/**
 * Get current user ID from Firebase Auth
 * @returns {string|null} Current user ID or null
 */
export const getCurrentUserId = () => {
  const auth = getAuth();
  return auth.currentUser?.uid || null;
};

/**
 * Get business profile for current authenticated user
 * @returns {Promise<object|null>} Business profile data or null
 */
export const getCurrentUserBusinessProfile = async () => {
  const userId = getCurrentUserId();
  if (!userId) {
    console.error("No authenticated user found");
    return null;
  }
  
  return await getBusinessProfile(userId);
};

/**
 * Update business profile for current authenticated user
 * @param {object} updatedData - Updated business profile data
 * @returns {Promise<boolean>} Success status
 */
export const updateCurrentUserBusinessProfile = async (updatedData) => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("No authenticated user found");
  }
  
  return await updateBusinessProfile(userId, updatedData);
}; 