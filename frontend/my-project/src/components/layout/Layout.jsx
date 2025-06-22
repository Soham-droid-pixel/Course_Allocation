import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import UserBadge from '../UserBadge'

function Layout() {
  const { user } = useAuth()
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path
  }

  const linkClasses = (path) => {
    const baseClasses = "px-3 py-4 text-sm font-medium border-b-2 transition-colors"
    if (isActive(path)) {
      return `${baseClasses} text-blue-600 border-blue-600`
    }
    return `${baseClasses} text-gray-900 hover:text-blue-600 border-transparent hover:border-blue-600`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Course Allocation System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <UserBadge />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {user?.role === 'student' && (
              <>
                <Link
                  to="/student/dashboard"
                  className={linkClasses('/student/dashboard')}
                >
                  Dashboard
                </Link>
                <Link
                  to="/student/preferences"
                  className={linkClasses('/student/preferences')}
                >
                  Preferences
                </Link>
                <Link
                  to="/student/status"
                  className={linkClasses('/student/status')}
                >
                  Status
                </Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={linkClasses('/admin/dashboard')}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/reports"
                  className={linkClasses('/admin/reports')}
                >
                  Reports
                </Link>
                <Link
                  to="/admin/analytics"
                  className={linkClasses('/admin/analytics')}
                >
                  Preferences Analysis
                </Link>
                <Link
                  to="/admin/preferences-analysis"
                  className={linkClasses('/admin/preferences-analysis')}
                >
                  Post-Allocation Analysis
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout