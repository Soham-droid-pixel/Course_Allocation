import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { triggerAllocation, downloadReport, getStats } from '../../services/api'

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pendingAllocations: 0,
    completedAllocations: 0
  })
  const [isAllocating, setIsAllocating] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const data = await getStats()
      setStats(data)
    } catch (error) {
      console.error('Stats fetch error:', error)
      toast.error('Failed to fetch statistics')
    }
  }

  const handleTriggerAllocation = async () => {
    try {
      setIsAllocating(true)
      
      console.log('Starting allocation...')
      const result = await triggerAllocation()
      console.log('Allocation result:', result)
      
      if (result && result.allocation_id) {
        toast.success(`Allocation completed! ${result.student_allocations?.length || 0} students allocated`)
        await fetchStats()
      } else {
        throw new Error('Invalid allocation result - missing allocation_id')
      }
    } catch (error) {
      console.error('Allocation error details:', error)
      
      // More specific error messages
      if (error.message.includes('fetch')) {
        toast.error('Network error: Could not connect to server')
      } else if (error.message.includes('404')) {
        toast.error('Allocation endpoint not found')
      } else if (error.message.includes('500')) {
        toast.error('Server error during allocation')
      } else {
        toast.error(error.message || 'Failed to complete allocation')
      }
    } finally {
      setIsAllocating(false)
    }
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-4xl font-bold mb-2">
                {getGreeting()}, Administrator! 👨‍💼
              </h1>
              <p className="text-blue-100 text-sm sm:text-base mb-3">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} • {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              <p className="text-blue-100 text-base sm:text-lg">
                🎯 Course Allocation Management System
              </p>
            </div>
            <div className="flex-shrink-0 text-center">
              <div className="text-4xl sm:text-6xl mb-2">⚡</div>
              <p className="text-blue-100 text-sm font-medium">Admin Control</p>
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Allocation Control Center</h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Manage course allocation process and monitor system status
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={fetchStats}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh Stats</span>
                <span className="sm:hidden">Refresh</span>
              </button>
              
              {!isAllocating ? (
                <button
                  onClick={handleTriggerAllocation}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                  disabled={stats.totalSubmissions === 0}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="hidden sm:inline">Start Allocation</span>
                  <span className="sm:hidden">Start</span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                  <span className="font-medium">Allocating...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Submissions</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.totalSubmissions}</p>
                <p className="text-sm text-gray-600 mt-1">Student preferences</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Allocations</h3>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingAllocations}</p>
                <p className="text-sm text-gray-600 mt-1">Awaiting processing</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Completed Allocations</h3>
                <p className="text-3xl font-bold text-green-600">{stats.completedAllocations}</p>
                <p className="text-sm text-gray-600 mt-1">Successfully processed</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* System Status & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🔧 System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Allocation Engine</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-600">Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database Connection</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-600">Connected</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Student Submissions</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stats.totalSubmissions > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className={`text-sm font-medium ${stats.totalSubmissions > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    {stats.totalSubmissions > 0 ? 'Active' : 'Waiting'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">⚡ Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group">
                <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <span className="text-sm font-medium text-blue-700 text-center">View Analytics</span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors group">
                <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📈</span>
                </div>
                <span className="text-sm font-medium text-green-700 text-center">Generate Reports</span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors group">
                <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🔍</span>
                </div>
                <span className="text-sm font-medium text-purple-700 text-center">Check Preferences</span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors group">
                <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⚙️</span>
                </div>
                <span className="text-sm font-medium text-orange-700 text-center">System Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Allocation Status Banner */}
        {isAllocating && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
            <div className="flex items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-200 border-t-indigo-600"></div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-indigo-900">Allocation in Progress</h3>
                <p className="text-indigo-700">Please wait while we process student course allocations...</p>
              </div>
            </div>
          </div>
        )}

        {/* Important Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-3">📋 Important Notes</h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 mt-0.5">•</span>
              <span>Ensure all students have submitted their preferences before running allocation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 mt-0.5">•</span>
              <span>Allocation process may take several minutes depending on student count</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 mt-0.5">•</span>
              <span>Review analytics and reports after allocation completion</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 mt-0.5">•</span>
              <span>System maintains backup of all allocation data automatically</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard