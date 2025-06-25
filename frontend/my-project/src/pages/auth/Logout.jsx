import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

function Logout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [logoutStatus, setLogoutStatus] = useState('processing'); // 'processing', 'success', 'error'

  useEffect(() => {
    const performLogout = async () => {
      try {
        setLogoutStatus('processing');
        
        // Get user info before logout for goodbye message
        const userEmail = user?.email;
        
        // Add delay to show logout process
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Perform logout
        logout();
        
        // Clear all storage
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (storageError) {
          console.warn('Storage clear error:', storageError);
        }
        
        setLogoutStatus('success');
        
        // Show success message
        if (userEmail) {
          toast.success(`Goodbye, ${userEmail}! You've been logged out successfully.`);
        } else {
          toast.success('You have been logged out successfully.');
        }
        
        // Redirect after showing success
        setTimeout(() => {
          navigate('/login', { replace: true, state: { fromLogout: true } });
        }, 1000);
        
      } catch (error) {
        console.error('Logout error:', error);
        setLogoutStatus('error');
        toast.error('Logout completed with warnings.');
        
        // Force clear everything anyway
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          console.warn('Force clear error:', e);
        }
        
        // Still redirect to login
        setTimeout(() => {
          navigate('/login', { replace: true, state: { fromLogout: true, hasError: true } });
        }, 2000);
      }
    };

    performLogout();
  }, [logout, navigate, user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-white/20 max-w-md w-full text-center">
        {/* Status Icon */}
        <div className="mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            logoutStatus === 'success' 
              ? 'bg-gradient-to-br from-green-100 to-green-200' 
              : logoutStatus === 'error'
              ? 'bg-gradient-to-br from-red-100 to-red-200'
              : 'bg-gradient-to-br from-blue-100 to-indigo-100'
          }`}>
            {logoutStatus === 'success' ? (
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : logoutStatus === 'error' ? (
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>
        </div>

        {/* Content */}
        <h2 className={`text-2xl font-bold mb-4 ${
          logoutStatus === 'success' ? 'text-green-900' : 
          logoutStatus === 'error' ? 'text-red-900' : 'text-gray-900'
        }`}>
          {logoutStatus === 'success' ? 'Logged Out Successfully!' : 
           logoutStatus === 'error' ? 'Logout Completed' : 'Logging out...'}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {logoutStatus === 'success' ? 'You have been securely logged out. Redirecting to login...' :
           logoutStatus === 'error' ? 'Logout completed with some warnings. Redirecting...' :
           'Please wait while we securely log you out of your account.'}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all duration-1000 ${
            logoutStatus === 'success' ? 'bg-gradient-to-r from-green-600 to-green-400 w-full' :
            logoutStatus === 'error' ? 'bg-gradient-to-r from-red-600 to-red-400 w-full' :
            'bg-gradient-to-r from-blue-600 to-indigo-600 animate-pulse w-3/4'
          }`}></div>
        </div>

        {/* Manual Navigation Button (shown on error) */}
        {logoutStatus === 'error' && (
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login Now
          </button>
        )}
      </div>
    </div>
  );
}

export default Logout;