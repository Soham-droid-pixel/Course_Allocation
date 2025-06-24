import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

function Logout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Get user info before logout for goodbye message
        const userEmail = user?.email;
        
        // Perform logout
        logout();
        
        // Clear any additional localStorage items
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('preferences');
        localStorage.removeItem('lastActivity');
        
        // Clear sessionStorage as well
        sessionStorage.clear();
        
        // Show success message
        if (userEmail) {
          toast.success(`Goodbye, ${userEmail}! You've been logged out successfully.`);
        } else {
          toast.success('You have been logged out successfully.');
        }
        
        // Redirect to login page
        navigate('/login', { replace: true });
        
      } catch (error) {
        console.error('Logout error:', error);
        toast.error('Logout failed. Please try again.');
        
        // Still redirect to login even if there's an error
        navigate('/login', { replace: true });
      }
    };

    performLogout();
  }, [logout, navigate, user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-white/20 max-w-md w-full text-center">
        {/* Loading Spinner */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Logging out...</h2>
        <p className="text-gray-600 mb-6">
          Please wait while we securely log you out of your account.
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

export default Logout;