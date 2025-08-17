/*This is a comprehensive admin analytics dashboard that displays student course preference data in three different views: Overview (category summaries with popular courses), Detailed Analysis (course-by-course demand with student lists), and Student List (individual student preferences with search). It fetches real-time data from the backend, processes complex analytics like demand levels and competition ratios, and presents everything in a responsive, mobile-friendly interface with interactive charts, color-coded demand indicators, and detailed breakdowns for administrative decision-making.

Main technologies used: React Hooks, Chart.js, Responsive Design, Data Visualization, Search/Filter, API Integration, Complex State Management*/
import { useState, useEffect } from 'react'
import { Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { toast } from 'react-hot-toast'
import { getPreferencesAnalysis } from '../../services/api'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

function Analytics() {
  const [analysisData, setAnalysisData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('PECL1')
  const [viewMode, setViewMode] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAnalysisData()
  }, [])

  const fetchAnalysisData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching analysis data...')
      const data = await getPreferencesAnalysis()
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format received')
      }
      
      console.log('Analysis data received successfully')
      setAnalysisData(data)
      
    } catch (error) {
      console.error('Analysis fetch error:', error)
      setError(error.message || 'Failed to fetch preferences analysis')
      
      // Set empty data to prevent crashes
      setAnalysisData({
        summary: { 
          total_students: 0, 
          confirmed_students: 0, 
          draft_students: 0, 
          completion_rate: 0 
        },
        course_demand: {},
        category_analysis: {},
        student_details: []
      })
    } finally {
      setLoading(false)
    }
  }

  const getDemandColor = (count, maxCount) => {
    const ratio = count / maxCount
    if (ratio >= 0.8) return 'bg-red-100 text-red-800 border-red-200'
    if (ratio >= 0.6) return 'bg-orange-100 text-orange-800 border-orange-200'
    if (ratio >= 0.4) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (ratio >= 0.2) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getDemandLevel = (count, maxCount) => {
    const ratio = count / maxCount
    if (ratio >= 0.8) return 'Very High'
    if (ratio >= 0.6) return 'High' 
    if (ratio >= 0.4) return 'Medium'
    if (ratio >= 0.2) return 'Low'
    return 'Very Low'
  }

  const filteredStudents = analysisData?.student_details?.filter(student =>
    student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 font-medium">Loading Preferences Analysis...</p>
            <p className="text-sm text-gray-500 mt-2">Analyzing student preferences and course demand</p>
          </div>
        </div>
      </div>
    )
  }

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">No Preferences Data Available</h3>
            <p className="text-gray-600 text-base sm:text-lg max-w-md mx-auto mb-8">
              No student preferences have been submitted yet. Please wait for students to complete their course selections.
            </p>
            <button
              onClick={fetchAnalysisData}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const categories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM', 'Honors', 'Minor']
  const selectedCourses = analysisData.course_demand[selectedCategory] || {}
  const maxDemand = Math.max(...Object.values(selectedCourses).map(course => course.total_demand), 1)

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                📊 Preferences Analysis
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Analyze student course preferences before running allocation
              </p>
            </div>
            <button
              onClick={fetchAnalysisData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh Data</span>
              <span className="sm:hidden">Refresh</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Total Students</h3>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{analysisData.summary.total_students}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-lg sm:text-xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Confirmed</h3>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{analysisData.summary.confirmed_students}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg sm:text-xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Draft</h3>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">{analysisData.summary.draft_students}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-lg sm:text-xl">📝</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Completion</h3>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600">
                  {analysisData.summary.completion_rate.toFixed(1)}%
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-lg sm:text-xl">📈</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            {/* Mobile Tab Selector */}
            <div className="sm:hidden px-4 py-3">
              <select 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="overview">📊 Overview - Category summary</option>
                <option value="detailed">📋 Course Details - Detailed analysis</option>
                <option value="students">👥 Student List - Individual preferences</option>
              </select>
            </div>

            {/* Desktop Tab Navigation */}
            <nav className="hidden sm:flex space-x-4 lg:space-x-8 px-6 overflow-x-auto">
              {[
                {
                  key: 'overview',
                  label: '📊 Overview',
                  desc: 'Category-wise summary'
                },
                {
                  key: 'detailed',
                  label: '📋 Course Details',
                  desc: 'Detailed course analysis'
                },
                {
                  key: 'students',
                  label: '👥 Student List',
                  desc: 'Individual preferences'
                }
              ].map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  className={`py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    viewMode === mode.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-sm sm:text-base">{mode.label}</div>
                    <div className="text-xs opacity-75">{mode.desc}</div>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* Overview Mode */}
            {viewMode === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Category-wise Preference Analysis</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {categories.map(category => {
                    const categoryData = analysisData.category_analysis[category]
                    if (!categoryData) return null

                    return (
                      <div key={category} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-900 text-sm sm:text-base">{category}</h4>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {categoryData.students_submitted} students
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <div className="text-green-800 font-bold text-lg">{categoryData.total_first_choices}</div>
                            <div className="text-green-600 text-xs">1st Choices</div>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <div className="text-blue-800 font-bold text-lg">{categoryData.total_second_choices}</div>
                            <div className="text-blue-600 text-xs">2nd Choices</div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Courses in Demand:</span>
                            <span className="font-medium">{categoryData.courses_with_demand}</span>
                          </div>
                          
                          {/* Most Popular Courses */}
                          {categoryData.most_popular_first && (
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                              <p className="text-xs text-green-700 font-medium mb-1">🏆 Most Popular 1st Choice:</p>
                              <p className="font-semibold text-green-800 text-sm">
                                {categoryData.most_popular_first.course_name}
                              </p>
                              <p className="text-xs text-green-600">
                                {categoryData.most_popular_first.count} students
                              </p>
                            </div>
                          )}
                          
                          {categoryData.most_popular_second && (
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <p className="text-xs text-blue-700 font-medium mb-1">🥈 Most Popular 2nd Choice:</p>
                              <p className="font-semibold text-blue-800 text-sm">
                                {categoryData.most_popular_second.course_name}
                              </p>
                              <p className="text-xs text-blue-600">
                                {categoryData.most_popular_second.count} students
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Detailed Mode */}
            {viewMode === 'detailed' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Course Analysis by Category</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Category:</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {Object.keys(selectedCourses).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(selectedCourses)
                      .sort(([,a], [,b]) => b.total_demand - a.total_demand)
                      .map(([courseId, courseData]) => (
                      <div key={courseId} className={`border-2 rounded-xl p-4 sm:p-6 ${getDemandColor(courseData.total_demand, maxDemand)}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-lg sm:text-xl mb-2">{courseData.course_name}</h4>
                            <p className="text-sm opacity-75 font-mono">Course ID: {courseId}</p>
                          </div>
                          <div className="text-center sm:text-right">
                            <div className="text-2xl sm:text-3xl font-bold">{courseData.total_demand}</div>
                            <div className="text-sm font-medium">Total Demand</div>
                            <div className="text-xs mt-2 px-3 py-1 bg-white bg-opacity-50 rounded-full font-medium">
                              {getDemandLevel(courseData.total_demand, maxDemand)} Demand
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div className="bg-white bg-opacity-30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                              <span className="font-semibold text-sm sm:text-base">
                                1st Choice ({courseData.first_choice_count})
                              </span>
                            </div>
                            <div className="max-h-32 overflow-y-auto">
                              <div className="grid gap-2">
                                {courseData.students_first_choice.map((student, index) => (
                                  <div key={index} className="text-xs sm:text-sm p-2 bg-white bg-opacity-50 rounded border">
                                    <span className="font-medium">{student.name}</span>
                                    <span className="text-gray-600 ml-2">({student.student_id})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white bg-opacity-30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                              <span className="font-semibold text-sm sm:text-base">
                                2nd Choice ({courseData.second_choice_count})
                              </span>
                            </div>
                            <div className="max-h-32 overflow-y-auto">
                              <div className="grid gap-2">
                                {courseData.students_second_choice.map((student, index) => (
                                  <div key={index} className="text-xs sm:text-sm p-2 bg-white bg-opacity-50 rounded border">
                                    <span className="font-medium">{student.name}</span>
                                    <span className="text-gray-600 ml-2">({student.student_id})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Capacity Analysis */}
                        <div className="mt-4 pt-4 border-t border-white border-opacity-30">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="text-sm font-medium">Allocation Feasibility:</span>
                            <span className="text-sm font-bold">
                              {courseData.total_demand > 60 ? '🔴 High Competition Expected' :
                               courseData.total_demand > 40 ? '🟡 Moderate Competition' :
                               courseData.total_demand >= 20 ? '🟢 Should Run Successfully' :
                               '⚠️ May Not Meet Minimum (20 students)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📋</span>
                    </div>
                    <p className="text-gray-600 text-lg">No course preferences found for {selectedCategory}</p>
                  </div>
                )}
              </div>
            )}

            {/* Students Mode */}
            {viewMode === 'students' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Individual Student Preferences</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Search:</label>
                    <input
                      type="text"
                      placeholder="Student name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full sm:w-64"
                    />
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student, index) => (
                        <div key={student.student_id} className={`p-4 sm:p-6 border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-gray-900">{student.name}</h4>
                              <p className="text-sm text-gray-600 mb-2">Student ID: {student.student_id}</p>
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  student.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {student.status.toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {student.total_preferences} categories completed
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {categories.map(category => {
                              const prefs = student.preferences[category]
                              if (!prefs || (!prefs.choice1.id && !prefs.choice2.id)) return null
                              
                              return (
                                <div key={category} className="bg-gray-100 rounded-lg p-3 border">
                                  <div className="font-semibold text-gray-800 mb-2 text-sm">{category}</div>
                                  {prefs.choice1.id && (
                                    <div className="flex items-start gap-2 mb-2">
                                      <div className="w-3 h-3 bg-green-500 rounded-full mt-0.5 flex-shrink-0"></div>
                                      <span className="text-xs text-gray-700 leading-tight">{prefs.choice1.name}</span>
                                    </div>
                                  )}
                                  {prefs.choice2.id && (
                                    <div className="flex items-start gap-2">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full mt-0.5 flex-shrink-0"></div>
                                      <span className="text-xs text-gray-700 leading-tight">{prefs.choice2.name}</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl">🔍</span>
                        </div>
                        <p className="text-gray-600 text-lg">No students found matching your search.</p>
                      </div>
                    )}
                  </div>
                </div>

                {filteredStudents.length === 0 && !searchTerm && (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">👥</span>
                    </div>
                    <p className="text-gray-600 text-lg">No student preferences available yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics