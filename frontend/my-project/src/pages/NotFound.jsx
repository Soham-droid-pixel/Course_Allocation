import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    if (user) {
      // Redirect based on user role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-6">
            <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          
          {/* 404 Text */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-gray-900">404</h1>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto rounded-full"></div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
          </p>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleGoHome}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {user ? 'Go to Dashboard' : 'Go to Login'}
            </button>
            
            <button
              onClick={() => navigate(-1)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold border border-gray-200 hover:border-gray-300 transition-all duration-200"
            >
              Go Back
            </button>
          </div>

          {/* Help Links */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Need help? Try these:</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {user ? (
                <>
                  {user.role === 'student' && (
                    <>
                      <Link to="/student/dashboard" className="text-blue-600 hover:text-blue-800 hover:underline">
                        Dashboard
                      </Link>
                      <Link to="/student/preferences" className="text-blue-600 hover:text-blue-800 hover:underline">
                        Preferences
                      </Link>
                      <Link to="/student/status" className="text-blue-600 hover:text-blue-800 hover:underline">
                        Status
                      </Link>
                    </>
                  )}
                  {user.role === 'admin' && (
                    <>
                      <Link to="/admin/dashboard" className="text-blue-600 hover:text-blue-800 hover:underline">
                        Dashboard
                      </Link>
                      <Link to="/admin/reports" className="text-blue-600 hover:text-blue-800 hover:underline">
                        Reports
                      </Link>
                      <Link to="/admin/analytics" className="text-blue-600 hover:text-blue-800 hover:underline">
                        Analytics
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link to="/login" className="text-blue-600 hover:text-blue-800 hover:underline">
                    Login
                  </Link>
                  <Link to="/signup" className="text-blue-600 hover:text-blue-800 hover:underline">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            © 2024 Course Allocation System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default NotFound;