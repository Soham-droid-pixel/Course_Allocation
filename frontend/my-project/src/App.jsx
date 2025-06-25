import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Logout from './pages/auth/Logout'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import StudentDashboard from './pages/student/Dashboard'
import StudentPreferences from './pages/student/Preferences'
import StudentStatus from './pages/student/Status'
import AdminDashboard from './pages/admin/Dashboard'
import AdminReports from './pages/admin/Reports'
import AdminAnalytics from './pages/admin/Analytics'
import PreferencesAnalysis from './pages/admin/PreferencesAnalysis'
import PreferenceConfirmation from './pages/student/PreferenceConfirmation'
import SimpleConfirm from './components/SimpleConfirm.jsx'

// Component to handle role-based redirection
function RoleBasedRedirect() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    // FIXED: Don't log redirect messages in production
    return <Navigate to="/login" replace />
  }
  
  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  } else if (user.role === 'student') {
    return <Navigate to="/student/dashboard" replace />
  } else {
    // FIXED: Invalid role should go to login with error state
    return <Navigate to="/login" replace state={{ error: 'Invalid user role' }} />
  }
}

// Error Boundary Component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">An unexpected error occurred. Please try again.</p>
        <div className="space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  )
}

// Main App Content Component
function AppContent() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/logout" element={<Logout />} />
      
      {/* Protected Routes with Layout */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Student Routes */}
        <Route path="student/dashboard" element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="student/preferences" element={
          <ProtectedRoute requiredRole="student">
            <StudentPreferences />
          </ProtectedRoute>
        } />
        <Route path="student/preferences/confirm" element={
          <ProtectedRoute requiredRole="student">
            <PreferenceConfirmation />
          </ProtectedRoute>
        } />
        <Route path="student/status" element={
          <ProtectedRoute requiredRole="student">
            <StudentStatus />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="admin/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="admin/reports" element={
          <ProtectedRoute requiredRole="admin">
            <AdminReports />
          </ProtectedRoute>
        } />
        <Route path="admin/analytics" element={
          <ProtectedRoute requiredRole="admin">
            <AdminAnalytics />
          </ProtectedRoute>
        } />
        <Route path="admin/preferences-analysis" element={
          <ProtectedRoute requiredRole="admin">
            <PreferencesAnalysis />
          </ProtectedRoute>
        } />

        {/* Simple Confirm Route */}
        <Route path="simple-confirm" element={<SimpleConfirm />} />

        {/* Default redirect based on user role */}
        <Route index element={<RoleBasedRedirect />} />
      </Route>

      {/* 404 Not Found - This catches all unmatched routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: '#10B981',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#EF4444',
              },
            },
          }}
        />
        <AppContent />
      </div>
    </AuthProvider>
  )
}

export default App