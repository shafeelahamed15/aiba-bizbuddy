import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseconfig';
import { useAuth } from '../context/AuthContext';

export default function CleanBusinessInfo() {
  const { currentUser } = useAuth();

  const cleanBusinessInfo = async () => {
    try {
      const ref = doc(db, 'users', currentUser.uid, 'business', 'info');
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        const currentData = snap.data();
        
        // Clean corrupted fields
        const cleanedData = {
          ...currentData,
          bankName: currentData.bankName?.includes('Channel') || currentData.bankName?.includes('kg/m') 
            ? 'KVBL Bank' : currentData.bankName
        };
        
        await setDoc(ref, cleanedData);
        alert('✅ Business info cleaned!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error cleaning business info:', error);
      alert('Error cleaning business info');
    }
  };

  return (
    <button 
      onClick={cleanBusinessInfo}
      className="px-3 py-1 bg-green-500 text-white rounded text-sm mr-2"
    >
      🧹 Clean Data
    </button>
  );
} 