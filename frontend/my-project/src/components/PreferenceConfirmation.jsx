import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { confirmPreferences, getMyPreferences } from '../../services/api'

function PreferenceConfirmation() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [preferences, setPreferences] = useState({})
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const courseNames = {
    // PECL1
    '25PECL13CE11': 'Image Processing Lab',
    '25PECL13CE12': 'Natural Language Processing Lab',
    '25PECL13CE13': 'IIOT Lab',
    '25PECL13CE14': 'Innovative Product Development Lab-Phase1',
    '25PECL13CE15': 'Open-Source Intelligence Lab',
    
    // PECL2
    '25PECL13CE21': 'Social Media Analytics Lab',
    '25PECL13CE22': 'Ethical Hacking Lab',
    '25PECL13CE23': 'DevOps Lab',
    '25PECL13CE24': 'Innovative Product Development Lab-Phase2',
    '25PECL13CE25': 'Explainable AI Lab',
    '25PECL13CE26': 'Software Testing Lab',
    
    // Program Elective
    '25PEC13CE11': 'Blockchain Technology',
    '25PEC13CE12': 'Deep Learning and Reinforcement Learning',
    '25PEC13CE13': 'Cyber Security',
    '25PEC13CE14': 'Big Data Analytics',
    '25PEC13CE15': 'Computer Graphics',
    '25PEC13CE16': 'HMI',
    '25PEC13CE17': 'Geographical Information Systems',
    
    // Open Elective
    'OE1': 'Advanced Microprocessor',
    'OE2': 'Internet of Things',
    'OE3': 'E-Vehicle',
    'OE4': 'Supply Chain Management',
    'OE5': 'Design of Experiments',
    'OE6': '3D Printing',
    
    // Honors
    'H1': 'IoT Honors',
    'H2': 'AI/ML Honors',
    'H3': 'Data Science Honors',
    'H4': 'Blockchain Honors',
    'H5': 'Cybersecurity Honors',
    
    // Minor
    'M1': 'Robotics Minor',
    'M2': '3D Printing Minor',
    
    // MDM
    'MDM1': 'Emotional and Spiritual Intelligence',
    'MDM2': 'Health, Wellness and Psychology'
  }

  useEffect(() => {
    if (user && user.roll_number) {
      loadPreferencesData()
    } else {
      setInitialLoading(false)
    }
  }, [user, location.state])

  const loadPreferencesData = async () => {
    try {
      setInitialLoading(true)
      
      if (location.state?.preferences && location.state?.fromForm) {
        console.log('Loading preferences from form submission:', location.state.preferences)
        setPreferences(location.state.preferences)
      } else {
        console.log('Loading existing preferences from API')
        const data = await getMyPreferences()
        
        if (data && data.preferences) {
          setPreferences(data.preferences)
        } else {
          toast.error('No preferences found. Please fill out the form first.')
          navigate('/student/preferences')
          return
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      toast.error('Failed to load preferences')
      navigate('/student/preferences')
    } finally {
      setInitialLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!user || !user.roll_number) {
      toast.error('Please log in to confirm preferences')
      return
    }

    try {
      setLoading(true)
      
      await confirmPreferences()
      
      toast.success('Preferences confirmed successfully!')
      navigate('/student/dashboard')
      
    } catch (error) {
      console.error('Confirmation error:', error)
      toast.error(error.message || 'Failed to confirm preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    navigate('/student/preferences', {
      state: {
        editMode: true,
        currentPreferences: preferences
      }
    })
  }

  const getCategoryIcon = (category) => {
    const icons = {
      'PECL1': '⚡',
      'PECL2': '🔬',
      'Program Elective': '📚',
      'Open Elective': '🌟',
      'Honors': '🏆',
      'Minor': '🎯',
      'MDM': '🧠'
    }
    return icons[category] || '📖'
  }

  const getCourseName = (courseId) => {
    return courseNames[courseId] || courseId
  }

  const getTotalCredits = () => {
    let total = 0
    Object.entries(preferences).forEach(([category, choices]) => {
      if (choices.choice1) {
        // Simplified credit calculation
        if (category === 'PECL1' || category === 'PECL2' || category === 'MDM') {
          total += 1
        } else if (category === 'Honors' || category === 'Minor') {
          total += 4
        } else {
          total += 3
        }
      }
    })
    return total
  }

  // Show login prompt if user is not authenticated
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
              <p className="text-gray-600 mb-6">Please log in to confirm your course preferences.</p>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-base sm:text-lg text-gray-600">Loading your preferences...</p>
        </div>
      </div>
    )
  }

  const hasPreferences = Object.keys(preferences).length > 0

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                ✅ Confirm Your Preferences
              </h1>
              <p className="text-green-100 text-sm sm:text-base lg:text-lg">
                Review and confirm your course selections for {user.roll_number}
              </p>
            </div>
            <div className="flex flex-col items-center sm:items-end">
              <div className="text-2xl sm:text-3xl font-bold">{getTotalCredits()}</div>
              <div className="text-xs sm:text-sm text-green-100">Total Credits</div>
            </div>
          </div>
        </div>

        {hasPreferences ? (
          <>
            {/* Preferences Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">📋 Your Course Selections</h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Please review your choices carefully before confirming. Once confirmed, changes may not be possible.
                </p>
              </div>

              <div className="p-4 sm:p-6">
                <div className="space-y-6">
                  {Object.entries(preferences).map(([category, choices]) => {
                    if (!choices.choice1 && !choices.choice2) return null
                    
                    return (
                      <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Category Header */}
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                              <span className="text-lg sm:text-xl">{getCategoryIcon(category)}</span>
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                                {category.replace('_', ' ')}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM'].includes(category) 
                                  ? 'Mandatory Category' 
                                  : 'Optional Category'
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Course Choices */}
                        <div className="p-4 sm:p-6 space-y-4">
                          {choices.choice1 && (
                            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-green-600 font-bold text-sm">1</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-green-800 text-sm sm:text-base mb-1">
                                  First Choice
                                </p>
                                <p className="text-gray-800 text-sm sm:text-base">
                                  {getCourseName(choices.choice1)}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Course ID: <span className="font-mono bg-gray-100 px-1 rounded">{choices.choice1}</span>
                                </p>
                              </div>
                            </div>
                          )}

                          {choices.choice2 && (
                            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-600 font-bold text-sm">2</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-blue-800 text-sm sm:text-base mb-1">
                                  Second Choice (Backup)
                                </p>
                                <p className="text-gray-800 text-sm sm:text-base">
                                  {getCourseName(choices.choice2)}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Course ID: <span className="font-mono bg-gray-100 px-1 rounded">{choices.choice2}</span>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-800 mb-2">⚠️ Before You Confirm</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Double-check all your course selections above</li>
                    <li>• Once confirmed, modifications may not be possible</li>
                    <li>• Your first choices will be prioritized during allocation</li>
                    <li>• Second choices serve as backups if first choices are unavailable</li>
                    <li>• Contact administration if you need to make changes after confirmation</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  onClick={handleEdit}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors border border-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Preferences
                </button>
                
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 focus:ring-4 focus:ring-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Confirming...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm Preferences
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No Preferences State */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">No Preferences Found</h3>
            <p className="text-gray-600 text-base sm:text-lg mb-8 max-w-md mx-auto">
              You haven't submitted any course preferences yet. Please fill out the preference form first.
            </p>
            <button
              onClick={() => navigate('/student/preferences')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Fill Preference Form
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PreferenceConfirmation