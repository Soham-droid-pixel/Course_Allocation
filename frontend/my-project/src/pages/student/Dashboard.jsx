import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { getMyAllocationStatus } from '../../services/api'
import { useAuth } from '../../hooks/useAuth.jsx'

function StudentDashboard() {
  const { user } = useAuth(); // Get authenticated user
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
  const [notifications, setNotifications] = useState([])
  const [quickTips, setQuickTips] = useState([])

  useEffect(() => {
    if (user && user.roll_number) {
      fetchStudentData()
    } else {
      setLoading(false)
    }

    // Generate notifications and tips
    generateNotifications()
    generateQuickTips()
  }, [user])

  const fetchStudentData = async () => {
    try {
      setLoading(true)
      // Use the new authenticated endpoint
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
          originalPreferences: allocation.original_preferences,
          difficulty: getCourseInfo(allocation.course_id).difficulty,
          prerequisites: getCourseInfo(allocation.course_id).prerequisites,
          credits: getCourseInfo(allocation.course_id).credits,
          studyTips: getCourseInfo(allocation.course_id).studyTips
        }
        courses.push(courseData)
        stats.totalAllocated++

        // Count preference types
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
        prerequisites: ['Basic Programming', 'Mathematics'],
        credits: 2,
        studyTips: ['Practice OpenCV regularly', 'Work on mini-projects', 'Join study groups']
      },
      '25PECL13CE12': {
        difficulty: 'Hard',
        prerequisites: ['Machine Learning', 'Python'],
        credits: 2,
        studyTips: ['Read research papers', 'Practice with real datasets', 'Understand linguistics basics']
      },
      // Add more courses...
      'MDM1': {
        difficulty: 'Easy',
        prerequisites: [],
        credits: 2,
        studyTips: ['Regular attendance', 'Participate in discussions', 'Self-reflection exercises']
      },
      'H1': {
        difficulty: 'Hard',
        prerequisites: ['Core IoT concepts'],
        credits: 4,
        studyTips: ['Hands-on projects', 'Industry mentorship', 'Research publications']
      }
    }
    
    return courseInfoMap[courseId] || {
      difficulty: 'Medium',
      prerequisites: [],
      credits: 2,
      studyTips: ['Regular study', 'Practice problems']
    }
  }

  const generateNotifications = () => {
    const notifications = [
      {
        id: 1,
        type: 'info',
        title: 'Course Registration Reminder',
        message: 'Remember to register for your allocated courses in the university portal',
        time: '2 hours ago',
        urgent: false
      },
      {
        id: 2,
        type: 'success',
        title: 'Study Group Available',
        message: 'Join study groups for your allocated courses in the student forum',
        time: '1 day ago',
        urgent: false
      },
      {
        id: 3,
        type: 'warning',
        title: 'Timetable Released',
        message: 'Class schedules for allocated courses are now available',
        time: '3 hours ago',
        urgent: true
      }
    ]
    setNotifications(notifications)
  }

  const generateQuickTips = () => {
    const tips = [
      {
        category: 'Study',
        tip: 'Create a study schedule for all your courses within the first week',
        icon: '📚'
      },
      {
        category: 'Networking',
        tip: 'Connect with classmates in each course for collaborative learning',
        icon: '🤝'
      },
      {
        category: 'Resources',
        tip: 'Check the digital library for course-specific reference materials',
        icon: '💡'
      },
      {
        category: 'Career',
        tip: 'Link your course projects to your LinkedIn profile for visibility',
        icon: '🚀'
      }
    ]
    setQuickTips(tips)
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to access your dashboard.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Personalized Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{getGreeting()}, {user.roll_number}! 👋</h2>
            <p className="opacity-90">
              {currentTime.toLocaleDateString()} • {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
            <p className="mt-1 opacity-80">
              {dashboardStats.allocationComplete 
                ? `🎯 You're all set with ${dashboardStats.totalAllocated} courses!`
                : '⏳ Your academic journey is being prepared...'
              }
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl mb-2">🎓</div>
            <p className="text-sm opacity-80">Academic Progress</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Toolbar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-3">
          <Link to="/student/preferences" className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">
            📝 Preferences
          </Link>
          <Link to="/student/status" className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors">
            📊 Full Status
          </Link>
          <button 
            onClick={() => fetchStudentData()}
            className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors"
          >
            🔄 Refresh
          </button>
          <button className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-100 transition-colors">
            🗓️ My Schedule
          </button>
          <button className="flex items-center gap-2 bg-pink-50 text-pink-700 px-4 py-2 rounded-lg hover:bg-pink-100 transition-colors">
            👥 Study Groups
          </button>
        </div>
      </div>

      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            🔔 Recent Updates
          </h3>
          <div className="space-y-2">
            {notifications.slice(0, 3).map(notification => (
              <div key={notification.id} className={`p-3 rounded-lg border-l-4 ${
                notification.urgent ? 'border-red-400 bg-red-50' : 
                notification.type === 'success' ? 'border-green-400 bg-green-50' : 'border-blue-400 bg-blue-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                  </div>
                  <span className="text-xs text-gray-500">{notification.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Course Overview */}
      {allocatedCourses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Course Cards */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📚 Your Course Portfolio
            </h3>
            <div className="grid gap-4">
              {allocatedCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{course.category}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(course.difficulty)}`}>
                          {course.difficulty}
                        </span>
                      </div>
                      <p className="text-lg font-medium text-gray-800">{course.name}</p>
                      <p className="text-sm text-gray-600">Credits: {course.credits} • Code: {course.code}</p>
                    </div>
                    {course.preferenceNumber && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        course.preferenceNumber === '1st Choice' ? 'bg-green-100 text-green-800' :
                        course.preferenceNumber === '2nd Choice' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {course.preferenceNumber}
                      </span>
                    )}
                  </div>

                  {/* Prerequisites */}
                  {course.prerequisites.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Prerequisites:</p>
                      <div className="flex flex-wrap gap-1">
                        {course.prerequisites.map((prereq, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {prereq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Study Tips */}
                  <div className="mt-3 p-2 bg-blue-50 rounded">
                    <p className="text-xs font-medium text-blue-900 mb-1">💡 Success Tips:</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      {course.studyTips.slice(0, 2).map((tip, index) => (
                        <li key={index}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar with Tips and Tools */}
          <div className="space-y-4">
            {/* Academic Dashboard */}
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-semibold text-gray-900 mb-3">🎯 Academic Overview</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Credits</span>
                  <span className="font-medium">{allocatedCourses.reduce((sum, course) => sum + course.credits, 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Course Difficulty</span>
                  <div className="flex gap-1">
                    {['Easy', 'Medium', 'Hard'].map(level => {
                      const count = allocatedCourses.filter(c => c.difficulty === level).length
                      return count > 0 ? (
                        <span key={level} className={`px-2 py-1 text-xs rounded ${getDifficultyColor(level)}`}>
                          {count} {level}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {dashboardStats.totalAllocated > 0 ? 
                        Math.round((dashboardStats.firstChoices / dashboardStats.totalAllocated) * 100) : 0}%
                    </div>
                    <p className="text-xs text-gray-600">First Choice Success</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-semibold text-gray-900 mb-3">💡 Smart Tips</h4>
              <div className="space-y-3">
                {quickTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-lg">{tip.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-800">{tip.category}</p>
                      <p className="text-xs text-gray-600">{tip.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Study Planner */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">📅 This Week</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Course Registration Due</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Textbook Purchase</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Study Group Formation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {allocatedCourses.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎓</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Your Academic Journey Awaits!</h3>
          <p className="text-gray-600 mb-6">
            {!dashboardStats.preferencesSubmitted 
              ? 'Submit your preferences to start building your course portfolio'
              : 'Course allocation is in progress. Your personalized dashboard will be ready soon!'
            }
          </p>
          {!dashboardStats.preferencesSubmitted && (
            <Link
              to="/student/preferences"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🚀 Get Started
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export default StudentDashboard