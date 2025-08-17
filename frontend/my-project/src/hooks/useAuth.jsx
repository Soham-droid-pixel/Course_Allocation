/*This file creates authentication context for the app using React Context API.

AuthProvider wraps the app and provides auth info & functions to all components.

State managed:

user: current logged-in user

loading: checks if auth status is being verified

useEffect: runs once to:

Check if a user is stored in localStorage.

Optionally verify with the server.

Set user and stop loading.

Functions provided via context:

login(credentials): logs in a user, saves data to state & localStorage.

signup(userData): signs up a new user.

logout(): clears user data and redirects to login.

Helper flags:

isAuthenticated, isAdmin, isStudent for easy role checks.

useAuth hook: allows any component to access user info and auth functions.*/
import { useState, useEffect, createContext, useContext } from 'react';
import { authAPI, tokenManager } from '../services/api';

const AuthContext = createContext();

// Make sure this is properly exported as a named export
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if we have a stored user
        const storedUser = localStorage.getItem('user');
        
        if (tokenManager.isAuthenticated() && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Optionally verify with server (only if needed)
          try {
            const userData = await authAPI.getCurrentUser();
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } catch (error) {
            // If server verification fails, keep the stored user data
            console.warn('Server verification failed, using stored user data:', error);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authAPI.logout();
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const { token, user } = await authAPI.login(credentials);
      
      console.log('Auth login - user data:', user);
      
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { token, user };
    } catch (error) {
      console.error('Login error in useAuth:', error);
      throw error;
    }
  };

  // Add signup function
  const signup = async (userData) => {
    try {
      console.log('Auth signup - user data:', userData);
      
      const response = await authAPI.signup(userData);
      
      console.log('Signup response:', response);
      
      return response;
    } catch (error) {
      console.error('Signup error in useAuth:', error);
      throw error;
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Make sure this is properly exported as a named export
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Add default export for backward compatibility
export default { AuthProvider, useAuth };