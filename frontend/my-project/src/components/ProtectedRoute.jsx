/*ProtectedRoute guards routes for logged-in users.

Shows a loading spinner while checking auth.

Redirects to login if the user isn’t authenticated.

If a specific role is required and the user doesn’t match, it shows an Access Denied page with options to go to their dashboard, go back, or logout.

If authenticated and authorized, it renders the page.

It basically ensures only the right users can access certain pages.*/
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-sm text-gray-500 mt-2">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated || !user) {
    console.log('ProtectedRoute: User not authenticated, redirecting to login');
    // Pass current location as state to redirect back after login
    return <Navigate to="/login" state={{ from: location, authError: true }} replace />;
  }

  // Check role requirements
  if (requiredRole && user.role !== requiredRole) {
    console.log(`ProtectedRoute: Role mismatch. Required: ${requiredRole}, User: ${user.role}`);
    
    // Show access denied page with proper navigation options
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-red-200">
            {/* Error Icon */}
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100 mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* Content */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-2">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              This page requires <span className="font-semibold text-red-600">{requiredRole}</span> role, 
              but you are logged in as <span className="font-semibold text-blue-600">{user.role}</span>.
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Go to correct dashboard */}
              <button
                onClick={() => {
                  if (user.role === 'admin') {
                    window.location.href = '/admin/dashboard';
                  } else if (user.role === 'student') {
                    window.location.href = '/student/dashboard';
                  } else {
                    window.location.href = '/login';
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors transform hover:scale-105 active:scale-95"
              >
                Go to {user.role === 'admin' ? 'Admin' : 'Student'} Dashboard
              </button>

              {/* Go back button */}
              <button
                onClick={() => window.history.back()}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-semibold border border-gray-300 transition-colors"
              >
                Go Back
              </button>

              {/* Logout button */}
              <button
                onClick={() => window.location.href = '/logout'}
                className="w-full text-red-600 hover:text-red-800 px-4 py-2 text-sm font-medium transition-colors"
              >
                Logout and Login as Different User
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                If you believe this is an error, please contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;