// Sidebar Component
// - Responsive navigation menu for students & admins
// - Uses useAuth hook to detect logged-in user and role
// - Renders different links for Student vs Admin
// - Updates current time every minute (shown in footer)
// - Mobile behavior:
//    • Full overlay + slide-in drawer
//    • Closes automatically on navigation or overlay click
// - Header section:
//    • Gradient background (role-based color)
//    • Displays role icon, role title, subtitle
//    • Shows user email and roll number
// - Navigation section:
//    • Lists role-specific links with icons + descriptions
//    • Active link gets gradient background, highlight, and dot
// - Footer section:
//    • Shows date + time in card style
//    • Logout button (navigates to /logout route)
//    • Quick system status indicator (online pulse animation)
// - Fully styled with TailwindCSS, transitions, gradients & shadows

import { NavLink, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx' // Updated import

function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth() // Use useAuth hook instead
  const isAdmin = user?.role === 'admin'
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const studentLinks = [
    { 
      to: '/student/dashboard', 
      label: 'Dashboard', 
      icon: '🏠',
      description: 'Overview & stats'
    },
    { 
      to: '/student/preferences', 
      label: 'Course Preferences', 
      icon: '📝',
      description: 'Select your courses'
    },
    { 
      to: '/student/status', 
      label: 'Allocation Status', 
      icon: '📊',
      description: 'View your results'
    }
  ]

  const adminLinks = [
    { 
      to: '/admin/dashboard', 
      label: 'Dashboard', 
      icon: '🏠',
      description: 'System overview'
    },
    { 
      to: '/admin/reports', 
      label: 'Reports', 
      icon: '📈',
      description: 'Generate reports'
    },
    { 
      to: '/admin/analytics', 
      label: 'Preferences Analysis', 
      icon: '🔍',
      description: 'Analyze preferences'
    },
    { 
      to: '/admin/preferences-analysis', 
      label: 'Post-Allocation Analysis', 
      icon: '📋',
      description: 'Allocation insights'
    }
  ]

  const links = isAdmin ? adminLinks : studentLinks

  const getRoleInfo = () => {
    if (isAdmin) {
      return {
        title: 'Admin Panel',
        subtitle: 'System Administration',
        roleIcon: '👨‍💼',
        bgGradient: 'from-purple-600 to-indigo-600'
      }
    }
    return {
      title: 'Student Portal',
      subtitle: 'Academic Dashboard',
      roleIcon: '🎓',
      bgGradient: 'from-blue-600 to-indigo-600'
    }
  }

  const roleInfo = getRoleInfo()

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:shadow-lg lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className={`bg-gradient-to-br ${roleInfo.bgGradient} p-6 text-white relative overflow-hidden`}>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Role Info */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">{roleInfo.roleIcon}</span>
            </div>
            <div>
              <h2 className="font-bold text-lg">{roleInfo.title}</h2>
              <p className="text-sm opacity-90">{roleInfo.subtitle}</p>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-sm font-medium mb-1">{user?.email}</p>
            {user?.roll_number && (
              <p className="text-xs opacity-75">Roll: {user.roll_number}</p>
            )}
          </div>

          {/* Decorative Elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/5 rounded-full"></div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                    }`}>
                      <span className="text-lg">{link.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{link.label}</p>
                      <p className={`text-xs ${
                        isActive ? 'text-white/80' : 'text-gray-500 group-hover:text-blue-500'
                      }`}>
                        {link.description}
                      </p>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          {/* Time Display */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>📅</span>
              <div>
                <p className="font-medium">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-xs">
                  {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          </div>

          {/* Logout Button - Updated to use Link */}
          <Link
            to="/logout"
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            onClick={onClose}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </Link>

          {/* Quick Stats */}
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500 mb-2">System Status</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-600">Online</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar