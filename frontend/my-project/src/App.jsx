import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import StudentDashboard from './pages/student/Dashboard'
import StudentPreferences from './pages/student/Preferences'
import StudentStatus from './pages/student/Status'
import AdminDashboard from './pages/admin/Dashboard'
import AdminReports from './pages/admin/Reports'
import AdminAnalytics from './pages/admin/Analytics'
import { getUser } from './services/auth'
import PreferenceConfirmation from './pages/student/PreferenceConfirmation'

function PrivateRoute({ children, allowedRoles }) {
  const user = getUser()
  
  if (!user) {
    return <Navigate to="/login" />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />
  }

  return children
}

function App() {
  return (
    <div className="App">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          {/* Student Routes */}
          <Route path="student/dashboard" element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentDashboard />
            </PrivateRoute>
          } />
          <Route path="student/preferences" element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentPreferences />
            </PrivateRoute>
          } />
          <Route path="student/preferences/confirm" element={
            <PrivateRoute allowedRoles={['student']}>
              <PreferenceConfirmation />
            </PrivateRoute>
          } />
          <Route path="student/status" element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentStatus />
            </PrivateRoute>
          } />

          {/* Admin Routes */}
          <Route path="admin/dashboard" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } />
          <Route path="admin/reports" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminReports />
            </PrivateRoute>
          } />
          <Route path="admin/analytics" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminAnalytics />
            </PrivateRoute>
          } />

          {/* Default redirect */}
          <Route index element={<Navigate to="/student/dashboard" />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App