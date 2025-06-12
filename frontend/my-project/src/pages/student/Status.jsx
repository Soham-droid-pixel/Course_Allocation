import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { getStudentAllocationStatus } from '../../services/api'

function Status() {
  const [statusData, setStatusData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState('')

  useEffect(() => {
    // Get student ID from localStorage, URL params, or user input
    const storedStudentId = localStorage.getItem('studentId') || 'STU1001' // Default for testing
    setStudentId(storedStudentId)
    fetchAllocationStatus(storedStudentId)
  }, [])

  const fetchAllocationStatus = async (id) => {
    try {
      setLoading(true)
      const data = await getStudentAllocationStatus(id)
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
        return 'text-green-600 bg-green-50'
      case 'no_preferences':
      case 'not_allocated':
        return 'text-red-600 bg-red-50'
      case 'no_allocation_run':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
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
        return 'bg-green-100 text-green-800'
      case '2nd Choice':
        return 'bg-blue-100 text-blue-800'
      case 'Alternative':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStudentIdChange = (e) => {
    const newId = e.target.value
    setStudentId(newId)
    if (newId.length >= 6) {
      localStorage.setItem('studentId', newId)
      fetchAllocationStatus(newId)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading allocation status...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Student ID Input */}
      <div className="mb-6">
        <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
          Student ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="studentId"
            value={studentId}
            onChange={handleStudentIdChange}
            placeholder="Enter your Student ID (e.g., STU1001)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => fetchAllocationStatus(studentId)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Check Status
          </button>
        </div>
      </div>

      {statusData && (
        <>
          {/* Overall Status */}
          <div className={`rounded-lg p-6 mb-6 ${getStatusColor(statusData.status)}`}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Allocation Status: {getStatusMessage(statusData.status)}
                </h2>
                <p className="text-sm opacity-80">{statusData.message}</p>
                {statusData.submission_status && (
                  <p className="text-sm mt-1">
                    Preferences Status: <span className="font-medium">
                      {statusData.submission_status.toUpperCase()}
                    </span>
                  </p>
                )}
              </div>
              {statusData.allocation_date && (
                <div className="text-right text-sm opacity-70">
                  <p>Allocated on:</p>
                  <p>{new Date(statusData.allocation_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Course Allocations */}
          {Object.keys(statusData.allocations).length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Your Course Allocations</h3>
              
              {/* Mandatory Courses */}
              <div className="grid gap-4">
                {['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM'].map(category => {
                  const allocation = statusData.allocations[category]
                  return (
                    <div key={category} className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{category}</h4>
                          {allocation ? (
                            <>
                              <p className="text-lg font-medium text-gray-800 mt-1">
                                {allocation.course_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                Course ID: {allocation.course_id}
                              </p>
                            </>
                          ) : (
                            <p className="text-red-600 font-medium">Not Allocated</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            allocation ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {allocation ? 'Allocated' : 'Not Allocated'}
                          </span>
                          {allocation?.preference_number && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPreferenceColor(allocation.preference_number)}`}>
                              {allocation.preference_number}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Show Original Preferences */}
                      {allocation?.original_preferences && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-2">Your Original Preferences:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {allocation.original_preferences.choice1.id && (
                              <div className={`p-2 rounded ${
                                allocation.course_id === allocation.original_preferences.choice1.id 
                                  ? 'bg-green-50 border border-green-200' 
                                  : 'bg-gray-50'
                              }`}>
                                <span className="font-medium">1st Choice:</span>
                                <p className="truncate">{allocation.original_preferences.choice1.name}</p>
                                <p className="text-gray-500">({allocation.original_preferences.choice1.id})</p>
                              </div>
                            )}
                            {allocation.original_preferences.choice2.id && (
                              <div className={`p-2 rounded ${
                                allocation.course_id === allocation.original_preferences.choice2.id 
                                  ? 'bg-blue-50 border border-blue-200' 
                                  : 'bg-gray-50'
                              }`}>
                                <span className="font-medium">2nd Choice:</span>
                                <p className="truncate">{allocation.original_preferences.choice2.name}</p>
                                <p className="text-gray-500">({allocation.original_preferences.choice2.id})</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Optional Courses */}
              {(statusData.allocations['Honors'] || statusData.allocations['Minor']) && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-3">Optional Courses</h4>
                  <div className="grid gap-4">
                    {['Honors', 'Minor'].map(category => {
                      const allocation = statusData.allocations[category]
                      if (!allocation) return null
                      
                      return (
                        <div key={category} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-900">{category}</h5>
                              <p className="text-lg font-medium text-gray-800 mt-1">
                                {allocation.course_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                Course ID: {allocation.course_id}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Allocated
                              </span>
                              {allocation.preference_number && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPreferenceColor(allocation.preference_number)}`}>
                                  {allocation.preference_number}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Show Original Preferences for Optional Courses */}
                          {allocation.original_preferences && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-500 mb-2">Your Original Preferences:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                {allocation.original_preferences.choice1.id && (
                                  <div className={`p-2 rounded ${
                                    allocation.course_id === allocation.original_preferences.choice1.id 
                                      ? 'bg-green-50 border border-green-200' 
                                      : 'bg-gray-50'
                                  }`}>
                                    <span className="font-medium">1st Choice:</span>
                                    <p className="truncate">{allocation.original_preferences.choice1.name}</p>
                                    <p className="text-gray-500">({allocation.original_preferences.choice1.id})</p>
                                  </div>
                                )}
                                {allocation.original_preferences.choice2.id && (
                                  <div className={`p-2 rounded ${
                                    allocation.course_id === allocation.original_preferences.choice2.id 
                                      ? 'bg-blue-50 border border-blue-200' 
                                      : 'bg-gray-50'
                                  }`}>
                                    <span className="font-medium">2nd Choice:</span>
                                    <p className="truncate">{allocation.original_preferences.choice2.name}</p>
                                    <p className="text-gray-500">({allocation.original_preferences.choice2.id})</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No Allocations */
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Course Allocations</h3>
              <p className="text-gray-600">
                {statusData.status === 'no_preferences' 
                  ? 'Please submit your course preferences first.'
                  : statusData.status === 'not_allocated'
                  ? 'You were not included in the latest allocation. Make sure your preferences are confirmed.'
                  : 'Course allocation has not been run yet. Please check back later.'
                }
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Important Notes:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <span className="font-medium">1st Choice</span> means you got your first preference</li>
              <li>• <span className="font-medium">2nd Choice</span> means you got your second preference</li>
              <li>• <span className="font-medium">Alternative</span> means you got an emergency allocation</li>
              <li>• Allocation status is updated after each allocation run</li>
              <li>• Contact admin if you believe there's an error in your allocation</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export default Status