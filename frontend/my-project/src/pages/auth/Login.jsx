/*Purpose

Allows users (admin or student) to log in securely, handle multiple error types, show helpful messages after failed attempts, and redirect based on role or previous page.

State

formData → { email, password }

loading → shows spinner during login process.

showPassword → toggle password visibility.

loginAttempts → tracks number of failed login attempts to show hints.

Hooks

useAuth() → provides login function and user object.

useNavigate() → navigation after login.

useLocation() → gets state from redirect, logout, or errors.

useEffect() →

Shows success/info/error messages based on location.state.

Redirects already authenticated users to /admin/dashboard or /student/dashboard depending on role.

Event Handlers

handleChange(e) → updates formData as user types.

handleSubmit(e) → validates inputs, calls login(formData), handles errors:

Invalid credentials

Disabled account

Network or timeout errors

Format errors (422)

Provides hints after 2+ failed attempts.

Password toggle → showPassword changes input type between "text" and "password".

UI Structure

Background & Pattern → gradient with optional grid for desktop.

Status Messages → shows logout success, auth error, general error, or login hints after 3+ failed attempts.

Main Card → rounded, shadowed card containing:

Header: icon + greeting

Form: email + password + submit button

Divider + Sign-up link

Help section after multiple failed attempts

Footer → copyright text.

Highlights

Role-based redirect: admin vs student.

Detailed error handling: multiple toast messages depending on issue.

Dynamic hints: provides support info after repeated failures.

UX touches: smooth focus states, hover/active scaling, loading spinner, show/hide password.*/
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth.jsx';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0); // Track failed attempts
  
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user came from logout or has auth error
  const fromLogout = location.state?.fromLogout;
  const hasLogoutError = location.state?.hasError;
  const authError = location.state?.authError;
  const errorMessage = location.state?.error;
  const redirectPath = location.state?.from?.pathname;

  // Show messages based on state
  useEffect(() => {
    if (fromLogout && !hasLogoutError) {
      toast.success('Successfully logged out!', { id: 'logout-success' });
    } else if (fromLogout && hasLogoutError) {
      toast.info('Logout completed. Please log in again.', { id: 'logout-info' });
    } else if (authError) {
      toast.error('Please log in to continue', { id: 'auth-error' });
    } else if (errorMessage) {
      toast.error(errorMessage, { id: 'error-message' });
    }

    // Clear the state to prevent repeated messages
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [fromLogout, hasLogoutError, authError, errorMessage, location.state]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const targetPath = redirectPath || (user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
      navigate(targetPath, { replace: true });
    }
  }, [user, navigate, redirectPath]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Attempting login with:', { email: formData.email });
      
      const { user } = await login(formData);
      
      // Reset login attempts on success
      setLoginAttempts(0);
      
      console.log('✅ Login successful, user:', user);
      
      toast.success(`Welcome back, ${user.email}! 🎉`);
      
      // Role-based navigation with fallback
      const targetPath = redirectPath || (user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
      
      console.log(`🔄 Redirecting to: ${targetPath}`);
      navigate(targetPath, { replace: true });
      
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Increment login attempts
      setLoginAttempts(prev => prev + 1);
      
      // Handle different types of errors with helpful messages
      if (error.message?.includes('Invalid credentials') || 
          error.message?.includes('Invalid email or password') ||
          error.message?.includes('401')) {
        toast.error(`❌ Invalid email or password. ${loginAttempts >= 2 ? 'Please double-check your credentials.' : ''}`);
      } else if (error.message?.includes('Account is disabled')) {
        toast.error('❌ Your account has been disabled. Please contact support.');
      } else if (error.message?.includes('Network error') || error.code === 'ERR_NETWORK') {
        toast.error('❌ Network error. Please check your internet connection and try again.');
      } else if (error.message?.includes('timeout')) {
        toast.error('❌ Request timeout. Please try again.');
      } else if (error.message?.includes('422')) {
        toast.error('❌ Please check your email and password format.');
      } else {
        toast.error(error.message || '❌ Login failed. Please try again.');
      }
      
      // Show helpful message after multiple failed attempts
      if (loginAttempts >= 2) {
        setTimeout(() => {
          toast.info('💡 Having trouble? Make sure you\'re using the correct email and password. Contact support if you need help.', {
            duration: 6000,
            id: 'help-message'
          });
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Pattern - Hidden on mobile for performance */}
      <div className="absolute inset-0 hidden lg:block">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Status Messages */}
        {(fromLogout || authError || errorMessage || loginAttempts >= 3) && (
          <div className="mb-6">
            {fromLogout && (
              <div className={`p-4 rounded-xl border ${hasLogoutError ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} mb-4`}>
                <p className={`text-sm font-medium ${hasLogoutError ? 'text-yellow-700' : 'text-green-700'}`}>
                  ✅ {hasLogoutError ? 'Logout completed. Please log in again.' : 'Successfully logged out!'}
                </p>
              </div>
            )}
            
            {authError && (
              <div className="p-4 rounded-xl border bg-blue-50 border-blue-200 mb-4">
                <p className="text-sm font-medium text-blue-700">
                  🔐 Please log in to access that page
                </p>
              </div>
            )}
            
            {errorMessage && (
              <div className="p-4 rounded-xl border bg-red-50 border-red-200 mb-4">
                <p className="text-sm font-medium text-red-700">
                  ⚠️ {errorMessage}
                </p>
              </div>
            )}
            
            {loginAttempts >= 3 && (
              <div className="p-4 rounded-xl border bg-yellow-50 border-yellow-200 mb-4">
                <p className="text-sm font-medium text-yellow-700 mb-2">
                  🔍 Having trouble logging in?
                </p>
                <ul className="text-xs text-yellow-600 space-y-1">
                  <li>• Double-check your email and password</li>
                  <li>• Make sure Caps Lock is off</li>
                  <li>• Try typing your password manually</li>
                  <li>• Contact support if you need help</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl sm:rounded-3xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 sm:px-8 py-8 sm:py-10 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {redirectPath ? 'Authentication Required' : 'Welcome Back'}
            </h2>
            <p className="text-blue-100 text-sm sm:text-base">
              {redirectPath ? 'Please log in to continue' : 'Course Allocation System'}
            </p>
          </div>

          {/* Form */}
          <div className="px-6 sm:px-8 py-8 sm:py-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 sm:py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base bg-gray-50 focus:bg-white"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 sm:py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base bg-gray-50 focus:bg-white"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={loading}
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 sm:py-4 px-4 rounded-xl font-semibold text-sm sm:text-base hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  redirectPath ? 'Sign in to Continue' : 'Sign in'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Don't have an account?</span>
                </div>
              </div>
            </div>

            {/* Sign Up Link */}
            <Link
              to="/signup"
              className="w-full block text-center bg-gray-50 hover:bg-gray-100 text-gray-700 py-3 sm:py-4 px-4 rounded-xl font-semibold text-sm sm:text-base border border-gray-200 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign up here
            </Link>

            {/* Help Section */}
            {loginAttempts >= 2 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Need help? Make sure you're using the correct credentials or contact support.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8">
          <p className="text-xs sm:text-sm text-gray-500">
            © 2024 Course Allocation System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;