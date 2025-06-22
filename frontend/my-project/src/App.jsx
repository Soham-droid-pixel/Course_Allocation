import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ProtectedRoute from './components/ProtectedRoute'
import StudentDashboard from './pages/student/Dashboard'
import StudentPreferences from './pages/student/Preferences'
import StudentStatus from './pages/student/Status'
import AdminDashboard from './pages/admin/Dashboard'
import AdminReports from './pages/admin/Reports'
import AdminAnalytics from './pages/admin/Analytics'
import PreferencesAnalysis from './pages/admin/PreferencesAnalysis'
import PreferenceConfirmation from './pages/student/PreferenceConfirmation'
import SimpleConfirm from './components/SimpleConfirm.jsx' // Import your SimpleConfirm component

// Component to handle role-based redirection
function RoleBasedRedirect() {
  const { user, loading } = useAuth()
  
  console.log('RoleBasedRedirect - user:', user, 'loading:', loading); // Debug log
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    console.log('No user, redirecting to login'); // Debug log
    return <Navigate to="/login" replace />
  }
  
  console.log('User role:', user.role); // Debug log
  
  if (user.role === 'admin') {
    console.log('Redirecting admin to dashboard'); // Debug log
    return <Navigate to="/admin/dashboard" replace />
  } else if (user.role === 'student') {
    console.log('Redirecting student to dashboard'); // Debug log
    return <Navigate to="/student/dashboard" replace />
  } else {
    console.log('Unknown role, redirecting to login'); // Debug log
    return <Navigate to="/login" replace />
  }
}

// Main App Content Component
function AppContent() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
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
        <Route path="/simple-confirm" element={<SimpleConfirm />} />

        {/* Default redirect based on user role */}
        <Route index element={<RoleBasedRedirect />} />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
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