import { useState } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import BusinessInfoModal from './BusinessInfoModal';

function SettingsMenu({ onBusinessInfoUpdated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Close menu when clicking outside
  const handleBackdropClick = () => {
    setIsOpen(false);
  };

  const handleEditBusinessInfo = () => {
    setIsBusinessModalOpen(true);
    setIsOpen(false); // Close the settings menu
  };

  const handleBusinessInfoUpdated = (updatedData) => {
    console.log('Business info updated:', updatedData);
    
    // Notify parent component (like ChatBot) about the update
    if (onBusinessInfoUpdated) {
      onBusinessInfoUpdated(updatedData);
    }
    
    // Dispatch a custom event for any component listening
    window.dispatchEvent(new CustomEvent('businessInfoUpdated', { 
      detail: updatedData 
    }));
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-20 sm:hidden" 
          onClick={handleBackdropClick}
        />
      )}
      
      {/* Settings Menu */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleMenu}
          className="flex items-center justify-center w-12 h-12 bg-gray-700 hover:bg-gray-600 border-2 border-gray-500 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          aria-label="Settings menu"
        >
          <span className="text-xl text-white">⚙️</span>
        </button>
        
        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
              Settings
            </div>
            
            {/* Edit Business Information Button */}
            <button
              onClick={handleEditBusinessInfo}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 flex items-center gap-2"
            >
              <span>🏢</span>
              Edit Business Information
            </button>
            
            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 flex items-center gap-2"
            >
              <span>🚪</span>
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Business Info Modal */}
      <BusinessInfoModal
        isOpen={isBusinessModalOpen}
        onClose={() => setIsBusinessModalOpen(false)}
        onBusinessInfoUpdated={handleBusinessInfoUpdated}
      />
    </>
  );
}

export default SettingsMenu; 