// Header Component
// - Shows app title, user info, and logout button
// - Uses useAuth hook to get logged-in user
// - Tracks current time (updates every minute)
// - Changes style when page is scrolled
// - Displays greeting + role (Admin/Student)
// - Responsive: detailed info on desktop, compact on mobile
// - Includes animated logo + gradient effects
// - Handles logout via Link navigation


import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx' // Updated import

function Header() {
  const { user } = useAuth() // Use useAuth hook instead
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
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const getRoleDisplayName = (role) => {
    return role === 'admin' ? 'Administrator' : 'Student'
  }

  const getRoleIcon = (role) => {
    return role === 'admin' ? '👨‍💼' : '🎓'
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-xl border-b border-gray-200' 
        : 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-lg'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${
              isScrolled 
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600' 
                : 'bg-white/20 backdrop-blur-sm'
            }`}>
              <span className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${
                isScrolled ? 'text-white' : 'text-white'
              }`}>
                🎓
              </span>
            </div>
            <div>
              <h1 className={`text-lg sm:text-xl lg:text-2xl font-bold transition-colors duration-300 ${
                isScrolled ? 'text-gray-900' : 'text-white'
              }`}>
                Course Allocation System
              </h1>
              <p className={`text-xs sm:text-sm hidden sm:block transition-colors duration-300 ${
                isScrolled ? 'text-gray-600' : 'text-blue-100'
              }`}>
                Academic Management Platform
              </p>
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Time Display - Hidden on mobile */}
            <div className="hidden lg:block text-right">
              <p className={`text-sm font-medium transition-colors duration-300 ${
                isScrolled ? 'text-gray-700' : 'text-white'
              }`}>
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
              <p className={`text-xs transition-colors duration-300 ${
                isScrolled ? 'text-gray-500' : 'text-blue-100'
              }`}>
                {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* User Avatar & Info */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-300 ${
                  isScrolled 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-white/20 text-white backdrop-blur-sm'
                }`}>
                  {getRoleIcon(user?.role)}
                </div>
                <div className="hidden sm:block text-right">
                  <p className={`text-sm font-semibold transition-colors duration-300 ${
                    isScrolled ? 'text-gray-900' : 'text-white'
                  }`}>
                    {user?.email || 'Guest User'}
                  </p>
                  <p className={`text-xs transition-colors duration-300 ${
                    isScrolled ? 'text-gray-600' : 'text-blue-100'
                  }`}>
                    {getRoleDisplayName(user?.role)}
                  </p>
                </div>
              </div>

              {/* Logout Button - Updated to use Link */}
              <Link 
                to="/logout"
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isScrolled 
                    ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-md' 
                    : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm focus:ring-white/50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile User Info Bar */}
        <div className="sm:hidden pb-3">
          <div className={`flex items-center justify-between text-sm transition-colors duration-300 ${
            isScrolled ? 'text-gray-600' : 'text-blue-100'
          }`}>
            <div>
              <span className="font-medium">{getGreeting()}, </span>
              <span className="font-semibold">{getRoleDisplayName(user?.role)}</span>
            </div>
            <div className="text-xs">
              {currentTime.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })} • {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        </div>
      </div>

      {/* Gradient Border */}
      {!isScrolled && (
        <div className="h-1 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500"></div>
      )}
    </header>
  )
}

export default Header