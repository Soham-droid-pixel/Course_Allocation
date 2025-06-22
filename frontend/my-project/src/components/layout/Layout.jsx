import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'
import UserBadge from '../UserBadge'

function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isScrolled, setIsScrolled] = useState(false)

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  const isActive = (path) => location.pathname === path

  const getNavItems = () => {
    if (user?.role === 'student') {
      return [
        { path: '/student/dashboard', label: 'Dashboard', icon: '🏠', desc: 'Overview & Stats' },
        { path: '/student/preferences', label: 'Preferences', icon: '📝', desc: 'Course Selection' },
        { path: '/student/status', label: 'Status', icon: '📊', desc: 'Allocation Results' }
      ]
    } else if (user?.role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: '🏠', desc: 'System Overview' },
        { path: '/admin/reports', label: 'Reports', icon: '📈', desc: 'Generate Reports' },
        { path: '/admin/analytics', label: 'Analytics', icon: '🔍', desc: 'Data Analysis' },
        { path: '/admin/preferences-analysis', label: 'Analysis', icon: '📋', desc: 'Allocation Insights' }
      ]
    }
    return []
  }

  const navItems = getNavItems()
  const roleInfo = user?.role === 'admin' 
    ? { title: 'Admin Panel', subtitle: 'System Administration', icon: '👨‍💼', gradient: 'from-purple-600 to-indigo-600' }
    : { title: 'Student Portal', subtitle: 'Academic Dashboard', icon: '🎓', gradient: 'from-blue-600 to-indigo-600' }

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 sm:w-80 bg-white shadow-2xl transform transition-all duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:shadow-lg lg:z-auto lg:w-64 xl:w-72
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className={`bg-gradient-to-br ${roleInfo.gradient} p-4 sm:p-6 text-white relative overflow-hidden`}>
          {/* Close Button for Mobile */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Logo & Role Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-xl sm:text-2xl">{roleInfo.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-base sm:text-lg truncate">{roleInfo.title}</h2>
              <p className="text-xs sm:text-sm opacity-90 truncate">{roleInfo.subtitle}</p>
            </div>
          </div>

          {/* User Info Card */}
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-sm font-medium truncate mb-1">{user?.email}</p>
            {user?.roll_number && (
              <p className="text-xs opacity-75">Roll: {user.roll_number}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs">Online</span>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full"></div>
          <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-white/5 rounded-full"></div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 sm:px-4 py-4 overflow-y-auto">
          <div className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-[1.02]'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:scale-[1.01]'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                  isActive(item.path) 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                }`}>
                  <span className="text-lg">{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.label}</p>
                  <p className={`text-xs truncate ${
                    isActive(item.path) ? 'text-white/80' : 'text-gray-500 group-hover:text-blue-500'
                  }`}>
                    {item.desc}
                  </p>
                </div>
                {isActive(item.path) && (
                  <div className="w-2 h-2 bg-white rounded-full flex-shrink-0"></div>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200">
          {/* Time Display */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>📅</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs truncate">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-xs opacity-75">
                  {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className={`sticky top-0 z-30 transition-all duration-300 ${
          isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white shadow-sm'
        }`}>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
              {/* Mobile Menu Button & Logo */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 lg:hidden transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <div className="flex items-center gap-2 lg:hidden">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🎓</span>
                  </div>
                  <h1 className="text-lg font-bold text-gray-900">Course Allocation</h1>
                </div>
              </div>

              {/* Desktop Title - Hidden on mobile */}
              <div className="hidden lg:block">
                <h1 className="text-xl font-bold text-gray-900">Course Allocation System</h1>
                <p className="text-xs text-gray-500">Academic Management Platform</p>
              </div>

              {/* User Info & Time */}
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Time Display - Hidden on mobile */}
                <div className="hidden sm:block text-right text-xs sm:text-sm">
                  <p className="text-gray-700 font-medium">
                    {currentTime.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-gray-500">
                    {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>

                {/* User Badge */}
                <UserBadge />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden sticky bottom-0 z-30 bg-white border-t border-gray-200 shadow-lg">
          <div className="grid grid-cols-3 gap-1 px-2 py-2">
            {navItems.slice(0, 3).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                  isActive(item.path)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
                {isActive(item.path) && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-blue-600 rounded-b-full"></div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Layout