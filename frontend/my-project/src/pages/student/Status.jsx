import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { getMyAllocationStatus } from '../../services/api'

function Status() {
  const { user } = useAuth()
  const [statusData, setStatusData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && user.roll_number) {
      fetchAllocationStatus()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchAllocationStatus = async () => {
    try {
      setLoading(true)
      const data = await getMyAllocationStatus()
      setStatusData(data)
    } catch (error) {
      toast.error(error.message || 'Failed to fetch allocation status')
      console.error('Status fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'allocated':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'no_preferences':
      case 'not_allocated':
        return 'text-red-700 bg-red-50 border-red-200'
      case 'no_allocation_run':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const getStatusMessage = (status) => {
    switch (status) {
      case 'allocated':
        return 'Successfully Allocated'
      case 'no_preferences':
        return 'No Preferences Submitted'
      case 'not_allocated':
        return 'Not Allocated'
      case 'no_allocation_run':
        return 'Allocation Pending'
      default:
        return 'Unknown Status'
    }
  }

  const getPreferenceColor = (preferenceNumber) => {
    switch (preferenceNumber) {
      case '1st Choice':
        return 'bg-green-100 text-green-800 border-green-200'
      case '2nd Choice':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Alternative':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryIcon = (category) => {
    const icons = {
      'PECL1': '⚡',
      'PECL2': '🔬',
      'Program Elective': '📚',
      'Open Elective': '🌟',
      'MDM': '🧠',
      'Honors': '🏆',
      'Minor': '🎯'
    }
    return icons[category] || '📖'
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6 sm:p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to view your allocation status.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-base sm:text-lg text-gray-600">Loading allocation status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                📊 My Allocation Status
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Roll Number:</span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-mono">
                    {user.roll_number}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Email:</span>
                  <span className="text-gray-900">{user.email}</span>
                </div>
              </div>
            </div>
            <button
              onClick={fetchAllocationStatus}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {statusData ? (
          <>
            {/* Status Overview Card */}
            <div className={`rounded-xl border-2 p-4 sm:p-6 ${getStatusColor(statusData.status)}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold mb-1">
                        Status: {getStatusMessage(statusData.status)}
                      </h2>
                      {statusData.submission_status && (
                        <p className="text-sm opacity-90">
                          Preferences: <span className="font-semibold capitalize">
                            {statusData.submission_status}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {statusData.allocation_date && (
                  <div className="text-right">
                    <p className="text-sm opacity-75 mb-1">Allocated on:</p>
                    <p className="font-semibold">
                      {new Date(statusData.allocation_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Course Allocations */}
            {Object.keys(statusData.allocations || {}).length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Your Course Portfolio</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {Object.keys(statusData.allocations).length} Courses
                  </span>
                </div>
                
                {/* Mandatory Courses Grid */}
                <div className="grid gap-4 sm:gap-6">
                  {['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM'].map(category => {
                    const allocation = statusData.allocations[category]
                    return (
                      <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            {/* Course Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">{getCategoryIcon(category)}</span>
                                <div>
                                  <h4 className="text-lg sm:text-xl font-bold text-gray-900">{category}</h4>
                                  {allocation ? (
                                    <>
                                      <p className="text-base sm:text-lg font-semibold text-gray-800 mt-1">
                                        {allocation.course_name}
                                      </p>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Course ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                          {allocation.course_id}
                                        </span>
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-red-600 font-semibold mt-1">Not Allocated</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Status Badges */}
                            <div className="flex flex-row sm:flex-col gap-2 sm:items-end">
                              <span className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                                allocation ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {allocation ? '✅ Allocated' : '❌ Not Allocated'}
                              </span>
                              {allocation?.preference_number && (
                                <span className={`px-3 py-2 rounded-lg text-sm font-semibold border ${getPreferenceColor(allocation.preference_number)}`}>
                                  {allocation.preference_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Optional Courses */}
                {(statusData.allocations['Honors'] || statusData.allocations['Minor']) && (
                  <div className="mt-8">
                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      🌟 Optional Courses
                    </h4>
                    <div className="grid gap-4">
                      {['Honors', 'Minor'].map(category => {
                        const allocation = statusData.allocations[category]
                        if (!allocation) return null
                        
                        return (
                          <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 sm:p-6">
                              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl">{getCategoryIcon(category)}</span>
                                    <div>
                                      <h5 className="text-lg font-bold text-gray-900">{category}</h5>
                                      <p className="text-base sm:text-lg font-semibold text-gray-800 mt-1">
                                        {allocation.course_name}
                                      </p>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Course ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                          {allocation.course_id}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-row sm:flex-col gap-2 sm:items-end">
                                  <span className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    ✅ Allocated
                                  </span>
                                  {allocation.preference_number && (
                                    <span className={`px-3 py-2 rounded-lg text-sm font-semibold border ${getPreferenceColor(allocation.preference_number)}`}>
                                      {allocation.preference_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* No Allocations State */
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">No Course Allocations</h3>
                <p className="text-gray-600 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
                  {statusData.status === 'no_preferences' 
                    ? 'Please submit your course preferences to get started with the allocation process.'
                    : statusData.status === 'not_allocated'
                    ? 'You were not included in the latest allocation. Please ensure your preferences are confirmed.'
                    : 'Course allocation has not been run yet. Please check back later for updates.'
                  }
                </p>
              </div>
            )}

            {/* Information Panel */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 sm:p-6">
              <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Important Information
              </h4>
              <div className="grid gap-3 sm:gap-4 text-sm text-blue-800">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p><span className="font-semibold">1st Choice</span> - You received your first preference for this course</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p><span className="font-semibold">2nd Choice</span> - You received your second preference for this course</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">A</span>
                  <p><span className="font-semibold">Alternative</span> - You received an alternative allocation for this course</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs">ℹ</span>
                  <p>Your allocation status is updated automatically after each allocation run. Contact admin if you notice any discrepancies.</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* No Data State */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">No Status Data Available</h3>
            <p className="text-gray-600 text-base sm:text-lg mb-6 max-w-md mx-auto">
              Unable to load your allocation status. This could be due to:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <ul className="text-left text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>You haven't submitted your preferences yet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>Your preferences are still being processed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>There's a temporary system issue</span>
                </li>
              </ul>
            </div>
            <button
              onClick={fetchAllocationStatus}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Status