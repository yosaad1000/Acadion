import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserIcon, 
  EnvelopeIcon, 
  KeyIcon, 
  CameraIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface ProfileFormData {
  name: string;
  email: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      role="alert"
      aria-live="polite"
      className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm ${
        type === 'success' 
          ? 'bg-green-50 text-green-700 border border-green-200' 
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      <div className="flex items-center">
        {type === 'success' ? (
          <CheckCircleIcon className="h-5 w-5 mr-2" aria-hidden="true" />
        ) : (
          <ExclamationCircleIcon className="h-5 w-5 mr-2" aria-hidden="true" />
        )}
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          aria-label="Close notification"
          className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'password' | 'face'>('personal');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle keyboard navigation for tabs
  const handleTabKeyDown = (event: React.KeyboardEvent, tab: 'personal' | 'password' | 'face') => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setActiveTab(tab);
    }
  };

  // Personal Information Form State
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Partial<ProfileFormData>>({});

  // Password Change Form State
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Partial<PasswordChangeData>>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Face Registration State
  const [faceLoading, setFaceLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email
      });
    }
  }, [user]);

  // Real-time validation for personal information
  const validateProfileField = (field: keyof ProfileFormData, value: string): string | null => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return null;
      case 'email':
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return null;
      default:
        return null;
    }
  };

  const handleProfileInputChange = (field: keyof ProfileFormData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation
    const error = validateProfileField(field, value);
    setProfileErrors(prev => ({ ...prev, [field]: error || undefined }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const errors: Partial<ProfileFormData> = {};
    Object.keys(profileData).forEach(key => {
      const field = key as keyof ProfileFormData;
      const error = validateProfileField(field, profileData[field]);
      if (error) errors[field] = error;
    });

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileLoading(true);
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      setNotification({
        type: 'success',
        message: 'Profile updated successfully!'
      });

      // Update user context if needed
      // Note: In a real app, you might want to refresh the user data
      
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update profile'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Password validation functions
  const getPasswordStrength = (password: string): { score: number; text: string; color: string } => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    if (score <= 2) return { score, text: 'Weak', color: 'text-red-600' };
    if (score <= 3) return { score, text: 'Fair', color: 'text-yellow-600' };
    if (score <= 4) return { score, text: 'Good', color: 'text-blue-600' };
    return { score, text: 'Strong', color: 'text-green-600' };
  };

  const validatePasswordField = (field: keyof PasswordChangeData, value: string): string | null => {
    switch (field) {
      case 'currentPassword':
        if (!value.trim()) return 'Current password is required';
        return null;
      case 'newPassword':
        if (!value.trim()) return 'New password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        }
        return null;
      case 'confirmPassword':
        if (!value.trim()) return 'Please confirm your password';
        if (value !== passwordData.newPassword) return 'Passwords do not match';
        return null;
      default:
        return null;
    }
  };

  const handlePasswordInputChange = (field: keyof PasswordChangeData, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation
    const error = validatePasswordField(field, value);
    setPasswordErrors(prev => ({ ...prev, [field]: error || undefined }));

    // Also validate confirm password when new password changes
    if (field === 'newPassword' && passwordData.confirmPassword) {
      const confirmError = validatePasswordField('confirmPassword', passwordData.confirmPassword);
      setPasswordErrors(prev => ({ ...prev, confirmPassword: confirmError || undefined }));
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const errors: Partial<PasswordChangeData> = {};
    Object.keys(passwordData).forEach(key => {
      const field = key as keyof PasswordChangeData;
      const error = validatePasswordField(field, passwordData[field]);
      if (error) errors[field] = error;
    });

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordLoading(true);
    
    try {
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      setNotification({
        type: 'success',
        message: 'Password changed successfully!'
      });

      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordErrors({});
      
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to change password'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Face registration functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setNotification({
        type: 'error',
        message: 'Please select a valid image file'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setNotification({
        type: 'error',
        message: 'Image size must be less than 5MB'
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFaceUpload = async () => {
    if (!selectedFile) return;

    setFaceLoading(true);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/profile/face', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to register face');
      }

      setNotification({
        type: 'success',
        message: 'Face registered successfully!'
      });

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      
      // Reset file input
      const fileInput = document.getElementById('face-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to register face'
      });
    } finally {
      setFaceLoading(false);
    }
  };

  const handleFaceDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your face registration? This action cannot be undone.')) {
      return;
    }

    setFaceLoading(true);
    
    try {
      const response = await fetch('/api/profile/face', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete face registration');
      }

      setNotification({
        type: 'success',
        message: 'Face registration deleted successfully!'
      });
      
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete face registration'
      });
    } finally {
      setFaceLoading(false);
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    const fileInput = document.getElementById('face-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const renderPersonalInfoForm = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="name"
                value={profileData.name}
                onChange={(e) => handleProfileInputChange('name', e.target.value)}
                aria-describedby={profileErrors.name ? "name-error" : undefined}
                aria-invalid={!!profileErrors.name}
                className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  profileErrors.name 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Enter your full name"
              />
            </div>
            {profileErrors.name && (
              <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
                {profileErrors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={profileData.email}
                onChange={(e) => handleProfileInputChange('email', e.target.value)}
                aria-describedby={profileErrors.email ? "email-error" : undefined}
                aria-invalid={!!profileErrors.email}
                className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  profileErrors.email 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Enter your email address"
              />
            </div>
            {profileErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                {profileErrors.email}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileLoading || Object.keys(profileErrors).some(key => profileErrors[key as keyof ProfileFormData])}
              className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                profileLoading || Object.keys(profileErrors).some(key => profileErrors[key as keyof ProfileFormData])
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {profileLoading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderPasswordForm = () => {
    const passwordStrength = getPasswordStrength(passwordData.newPassword);
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                  aria-describedby={passwordErrors.currentPassword ? "current-password-error" : undefined}
                  aria-invalid={!!passwordErrors.currentPassword}
                  className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    passwordErrors.currentPassword 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  aria-label={showPasswords.current ? "Hide current password" : "Show current password"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                >
                  {showPasswords.current ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p id="current-password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {passwordErrors.currentPassword}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    passwordErrors.newPassword 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  aria-label={showPasswords.new ? "Hide new password" : "Show new password"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                >
                  {showPasswords.new ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Password strength:</span>
                    <span className={`font-medium ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength.score <= 2 ? 'bg-red-500' :
                        passwordStrength.score <= 3 ? 'bg-yellow-500' :
                        passwordStrength.score <= 4 ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {passwordErrors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    passwordErrors.confirmPassword 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  aria-label={showPasswords.confirm ? "Hide confirm password" : "Show confirm password"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                >
                  {showPasswords.confirm ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li className="flex items-center">
                  <span className={`mr-2 ${passwordData.newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordData.newPassword.length >= 8 ? '✓' : '○'}
                  </span>
                  At least 8 characters long
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${/[a-z]/.test(passwordData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/[a-z]/.test(passwordData.newPassword) ? '✓' : '○'}
                  </span>
                  Contains lowercase letters
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${/[A-Z]/.test(passwordData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/[A-Z]/.test(passwordData.newPassword) ? '✓' : '○'}
                  </span>
                  Contains uppercase letters
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${/\d/.test(passwordData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/\d/.test(passwordData.newPassword) ? '✓' : '○'}
                  </span>
                  Contains numbers
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${/[^a-zA-Z\d]/.test(passwordData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/[^a-zA-Z\d]/.test(passwordData.newPassword) ? '✓' : '○'}
                  </span>
                  Contains special characters
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading || Object.keys(passwordErrors).some(key => passwordErrors[key as keyof PasswordChangeData])}
                className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  passwordLoading || Object.keys(passwordErrors).some(key => passwordErrors[key as keyof PasswordChangeData])
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {passwordLoading ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderFaceRegistrationForm = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Face Recognition</h3>
        
        {/* Current Status */}
        <div className={`p-4 rounded-lg border-2 mb-6 ${
          user?.is_face_registered 
            ? 'border-green-200 bg-green-50' 
            : 'border-yellow-200 bg-yellow-50'
        }`}>
          <div className="flex items-center">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              user?.is_face_registered ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <CameraIcon className={`h-6 w-6 ${
                user?.is_face_registered ? 'text-green-600' : 'text-yellow-600'
              }`} />
            </div>
            <div className="ml-4">
              <h4 className={`font-medium ${
                user?.is_face_registered ? 'text-green-900' : 'text-yellow-900'
              }`}>
                {user?.is_face_registered ? 'Face Registered' : 'No Face Registration'}
              </h4>
              <p className={`text-sm ${
                user?.is_face_registered ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {user?.is_face_registered 
                  ? 'Your face is registered for attendance tracking' 
                  : 'Register your face to enable automatic attendance marking'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {user?.is_face_registered ? 'Update Face Registration' : 'Register Your Face'}
            </label>
            
            {/* File Input */}
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="face-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                {previewUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={previewUrl}
                      alt="Face preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        clearFileSelection();
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <CameraIcon className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 5MB)</p>
                  </div>
                )}
                <input
                  id="face-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={faceLoading}
                />
              </label>
            </div>
          </div>

          {/* Upload Button */}
          {selectedFile && (
            <div className="flex justify-center">
              <button
                onClick={handleFaceUpload}
                disabled={faceLoading}
                className={`px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  faceLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {faceLoading ? 'Uploading...' : user?.is_face_registered ? 'Update Face' : 'Register Face'}
              </button>
            </div>
          )}

          {/* Delete Button */}
          {user?.is_face_registered && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Delete Face Registration</h4>
                  <p className="text-sm text-gray-500">
                    Remove your face data from the system. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={handleFaceDelete}
                  disabled={faceLoading}
                  className={`px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                    faceLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {faceLoading ? 'Deleting...' : 'Delete Face Data'}
                </button>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Tips for a good photo:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Face the camera directly with good lighting
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Remove glasses and keep a neutral expression
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Ensure your face is clearly visible and centered
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Use a plain background if possible
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Make sure the image is not blurry or pixelated
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Profile settings navigation">
            <button
              onClick={() => setActiveTab('personal')}
              onKeyDown={(e) => handleTabKeyDown(e, 'personal')}
              role="tab"
              aria-selected={activeTab === 'personal'}
              aria-controls="personal-panel"
              tabIndex={activeTab === 'personal' ? 0 : -1}
              className={`py-4 px-1 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                activeTab === 'personal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Personal Info
            </button>
            <button
              onClick={() => setActiveTab('password')}
              onKeyDown={(e) => handleTabKeyDown(e, 'password')}
              role="tab"
              aria-selected={activeTab === 'password'}
              aria-controls="password-panel"
              tabIndex={activeTab === 'password' ? 0 : -1}
              className={`py-4 px-1 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Password
            </button>
            {user?.user_type === 'student' && (
              <button
                onClick={() => setActiveTab('face')}
                onKeyDown={(e) => handleTabKeyDown(e, 'face')}
                role="tab"
                aria-selected={activeTab === 'face'}
                aria-controls="face-panel"
                tabIndex={activeTab === 'face' ? 0 : -1}
                className={`py-4 px-1 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  activeTab === 'face'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Face Recognition
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="px-6 py-6">
          {activeTab === 'personal' && (
            <div role="tabpanel" id="personal-panel" aria-labelledby="personal-tab">
              {renderPersonalInfoForm()}
            </div>
          )}
          {activeTab === 'password' && (
            <div role="tabpanel" id="password-panel" aria-labelledby="password-tab">
              {renderPasswordForm()}
            </div>
          )}
          {activeTab === 'face' && user?.user_type === 'student' && (
            <div role="tabpanel" id="face-panel" aria-labelledby="face-tab">
              {renderFaceRegistrationForm()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;