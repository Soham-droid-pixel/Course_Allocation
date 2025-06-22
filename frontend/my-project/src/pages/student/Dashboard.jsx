import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { getMyAllocationStatus } from '../../services/api'
import { useAuth } from '../../hooks/useAuth.jsx'

function StudentDashboard() {
  const { user } = useAuth();
  const [allocatedCourses, setAllocatedCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [dashboardStats, setDashboardStats] = useState({
    totalAllocated: 0,
    firstChoices: 0,
    secondChoices: 0,
    alternatives: 0,
    preferencesSubmitted: false,
    allocationComplete: false
  })
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (user && user.roll_number) {
      fetchStudentData()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchStudentData = async () => {
    try {
      setLoading(true)
      const statusData = await getMyAllocationStatus()
      
      const courses = []
      const stats = {
        totalAllocated: 0,
        firstChoices: 0,
        secondChoices: 0,
        alternatives: 0,
        preferencesSubmitted: statusData.submission_status === 'confirmed',
        allocationComplete: statusData.status === 'allocated'
      }

      Object.entries(statusData.allocations || {}).forEach(([category, allocation]) => {
        const courseData = {
          id: allocation.course_id,
          name: allocation.course_name,
          code: allocation.course_id,
          category: category,
          status: 'allocated',
          preferenceNumber: allocation.preference_number,
          ...getCourseInfo(allocation.course_id)
        }
        courses.push(courseData)
        stats.totalAllocated++

        switch (allocation.preference_number) {
          case '1st Choice':
            stats.firstChoices++
            break
          case '2nd Choice':
            stats.secondChoices++
            break
          case 'Alternative':
            stats.alternatives++
            break
        }
      })

      setAllocatedCourses(courses)
      setDashboardStats(stats)
      
    } catch (error) {
      console.error('Error fetching student data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getCourseInfo = (courseId) => {
    const courseInfoMap = {
      '25PECL13CE11': {
        difficulty: 'Medium',
        credits: 2,
        studyTips: ['Practice OpenCV regularly', 'Work on mini-projects'],
        icon: '🖼️'
      },
      '25PECL13CE12': {
        difficulty: 'Hard',
        credits: 2,
        studyTips: ['Read research papers', 'Practice with datasets'],
        icon: '🧠'
      },
      'MDM1': {
        difficulty: 'Easy',
        credits: 2,
        studyTips: ['Regular attendance', 'Self-reflection exercises'],
        icon: '🧘'
      },
      'H1': {
        difficulty: 'Hard',
        credits: 4,
        studyTips: ['Hands-on projects', 'Industry mentorship'],
        icon: '🏆'
      }
    }
    
    return courseInfoMap[courseId] || {
      difficulty: 'Medium',
      credits: 2,
      studyTips: ['Regular study', 'Practice problems'],
      icon: '📚'
    }
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 border-green-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Hard': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPreferenceColor = (preferenceNumber) => {
    switch (preferenceNumber) {
      case '1st Choice': return 'bg-green-100 text-green-800 border-green-200'
      case '2nd Choice': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Alternative': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-lg text-gray-600">Please log in to access your dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-4xl font-bold mb-2">
                {getGreeting()}, {user.roll_number}! 👋
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
                {dashboardStats.allocationComplete 
                  ? `🎯 You're enrolled in ${dashboardStats.totalAllocated} courses!`
                  : '⏳ Your course allocation is being prepared...'
                }
              </p>
            </div>
            <div className="flex-shrink-0 text-center">
              <div className="text-4xl sm:text-6xl mb-2">🎓</div>
              <p className="text-blue-100 text-sm font-medium">Academic Hub</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">⚡ Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Link 
              to="/student/preferences" 
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center">
                <span className="text-xl">📝</span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-blue-700 text-center">Preferences</span>
            </Link>
            
            <Link 
              to="/student/status" 
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-green-700 text-center">Full Status</span>
            </Link>
            
            <button 
              onClick={fetchStudentData}
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center">
                <span className="text-xl">🔄</span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-purple-700 text-center">Refresh</span>
            </button>
            
            <button 
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-lg flex items-center justify-center">
                <span className="text-xl">🗓️</span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-orange-700 text-center">Schedule</span>
            </button>
            
            <button 
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-pink-50 hover:bg-pink-100 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-pink-100 group-hover:bg-pink-200 rounded-lg flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-pink-700 text-center">Study Groups</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {dashboardStats.allocationComplete && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Courses</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{dashboardStats.totalAllocated}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">First Choices</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{dashboardStats.firstChoices}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                    {dashboardStats.totalAllocated > 0 ? 
                      Math.round((dashboardStats.firstChoices / dashboardStats.totalAllocated) * 100) : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📈</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Credits</p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                    {allocatedCourses.reduce((sum, course) => sum + course.credits, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Course Portfolio */}
        {allocatedCourses.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">📚 Your Course Portfolio</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {allocatedCourses.length} Courses
              </span>
            </div>
            
            <div className="grid gap-4 sm:gap-6">
              {allocatedCourses.map((course) => (
                <div key={course.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Course Icon & Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">{course.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 text-base sm:text-lg">{course.category}</h3>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getDifficultyColor(course.difficulty)}`}>
                            {course.difficulty}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm sm:text-base mb-1">{course.name}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-600">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                            {course.code}
                          </span>
                          <span>Credits: {course.credits}</span>
                        </div>
                      </div>
                    </div>

                    {/* Preference Badge */}
                    <div className="flex justify-end sm:justify-start">
                      {course.preferenceNumber && (
                        <span className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border ${getPreferenceColor(course.preferenceNumber)}`}>
                          {course.preferenceNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Study Tips */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-semibold text-blue-900 mb-2">💡 Success Tips:</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      {course.studyTips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎓</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Your Academic Journey Awaits!</h3>
            <p className="text-gray-600 text-base sm:text-lg mb-8 max-w-md mx-auto">
              {!dashboardStats.preferencesSubmitted 
                ? 'Submit your course preferences to start building your academic portfolio'
                : 'Course allocation is in progress. Your personalized dashboard will be ready soon!'
              }
            </p>
            {!dashboardStats.preferencesSubmitted && (
              <Link
                to="/student/preferences"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                <span className="text-lg">🚀</span>
                Get Started
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentDashboard