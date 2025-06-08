import { useState, useEffect } from 'react';
import { getCurrentUserBusinessProfile, updateCurrentUserBusinessProfile } from '../firebase/businessProfile';

function BusinessInfoModal({ isOpen, onClose, onBusinessInfoUpdated }) {
  const [formData, setFormData] = useState({
    businessName: '',
    hoAddress: '',
    boAddress: '',
    gstin: '',
    email: '',
    phone: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: ''
  });

  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load business info when modal opens
  useEffect(() => {
    if (isOpen) {
      loadBusinessInfo();
    }
  }, [isOpen]);

  // Check for changes whenever formData changes
  useEffect(() => {
    const dataChanged = Object.keys(formData).some(key => 
      formData[key] !== originalData[key]
    );
    setHasChanges(dataChanged);
  }, [formData, originalData]);

  const loadBusinessInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const businessInfo = await getCurrentUserBusinessProfile();
      
      if (businessInfo) {
        const loadedData = {
          businessName: businessInfo.businessName || '',
          hoAddress: businessInfo.hoAddress || businessInfo.address || '',
          boAddress: businessInfo.boAddress || '',
          gstin: businessInfo.gstin || '',
          email: businessInfo.email || '',
          phone: businessInfo.phone || '',
          accountNumber: businessInfo.accountNumber || businessInfo.bankAccount || '',
          ifscCode: businessInfo.ifscCode || businessInfo.ifsc || '',
          bankName: businessInfo.bankName || '',
          branchName: businessInfo.branchName || businessInfo.branch || ''
        };
        
        setFormData(loadedData);
        setOriginalData(loadedData);
      }
    } catch (err) {
      console.error('Error loading business info:', err);
      setError('Failed to load business information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Prepare data for Firebase (using original field names for compatibility)
      const updateData = {
        businessName: formData.businessName,
        address: formData.hoAddress, // Main address field
        hoAddress: formData.hoAddress,
        boAddress: formData.boAddress,
        gstin: formData.gstin,
        email: formData.email,
        phone: formData.phone,
        bankAccount: formData.accountNumber, // Legacy field name
        accountNumber: formData.accountNumber,
        ifsc: formData.ifscCode, // Legacy field name
        ifscCode: formData.ifscCode,
        bankName: formData.bankName,
        branch: formData.branchName, // Legacy field name
        branchName: formData.branchName
      };
      
      await updateCurrentUserBusinessProfile(updateData);
      
      setSuccess('Business Information Updated Successfully! ✅');
      setOriginalData(formData); // Update original data to reflect saved state
      setHasChanges(false);
      
      // Call the callback to notify parent component
      if (onBusinessInfoUpdated) {
        onBusinessInfoUpdated(updateData);
      }
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
      
    } catch (err) {
      console.error('Error saving business info:', err);
      setError('Failed to save business information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmClose) return;
    }
    
    onClose();
    setError('');
    setSuccess('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <span>🏢</span>
            Edit Business Information
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold focus:outline-none"
          >
            ×
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading business information...</p>
            </div>
          )}

          {!loading && (
            <form className="space-y-4">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your business name"
                  required
                />
              </div>

              {/* HO Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Head Office (HO) Address *
                </label>
                <textarea
                  name="hoAddress"
                  value={formData.hoAddress}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your head office address"
                  required
                />
              </div>

              {/* BO Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Office (BO) Address
                </label>
                <textarea
                  name="boAddress"
                  value={formData.boAddress}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your branch office address (optional)"
                />
              </div>

              {/* GSTIN and Email - Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GSTIN *
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="22AAAAA0000A1Z5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="business@example.com"
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              {/* Bank Details Section */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <span>🏦</span>
                  Bank Details
                </h3>

                {/* Account Number and IFSC - Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1234567890123456"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IFSC Code *
                    </label>
                    <input
                      type="text"
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="SBIN0001234"
                      required
                    />
                  </div>
                </div>

                {/* Bank Name and Branch Name - Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="State Bank of India"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch Name *
                    </label>
                    <input
                      type="text"
                      name="branchName"
                      value={formData.branchName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Main Branch"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center gap-2">
                  <span>❌</span>
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center gap-2">
                  <span>✅</span>
                  {success}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {hasChanges && (
                <>
                  <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                  Unsaved changes
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`px-6 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
                  hasChanges && !saving
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BusinessInfoModal; 