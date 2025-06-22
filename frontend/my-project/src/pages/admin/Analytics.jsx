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
  const [viewMode, setViewMode] = useState('overview') // overview, detailed, students
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
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading preferences analysis...</p>
        </div>
      </div>
    )
  }

  if (!analysisData) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Preferences Data</h3>
        <p className="text-gray-600">No student preferences available for analysis.</p>
      </div>
    )
  }

  const categories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM', 'Honors', 'Minor']
  const selectedCourses = analysisData.course_demand[selectedCategory] || {}
  const maxDemand = Math.max(...Object.values(selectedCourses).map(course => course.total_demand), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Preferences Analysis</h2>
          <p className="text-gray-600">
            Analyze student course preferences before running allocation
          </p>
        </div>
        <button
          onClick={fetchAnalysisData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500">Total Students</h3>
          <p className="text-2xl font-bold text-gray-900">{analysisData.summary.total_students}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500">Confirmed Preferences</h3>
          <p className="text-2xl font-bold text-green-600">{analysisData.summary.confirmed_students}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <h3 className="text-sm font-medium text-gray-500">Draft Preferences</h3>
          <p className="text-2xl font-bold text-orange-600">{analysisData.summary.draft_students}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
          <p className="text-2xl font-bold text-purple-600">
            {analysisData.summary.completion_rate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
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
                className={`py-4 border-b-2 font-medium text-sm ${
                  viewMode === mode.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div>{mode.label}</div>
                  <div className="text-xs opacity-75">{mode.desc}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Mode */}
          {viewMode === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Category-wise Preference Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {categories.map(category => {
                  const categoryData = analysisData.category_analysis[category]
                  return (
                    <div key={category} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">{category}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Students Submitted:</span>
                          <span className="font-medium">{categoryData.students_submitted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total 1st Choices:</span>
                          <span className="font-medium text-green-600">{categoryData.total_first_choices}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total 2nd Choices:</span>
                          <span className="font-medium text-blue-600">{categoryData.total_second_choices}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Courses in Demand:</span>
                          <span className="font-medium">{categoryData.courses_with_demand}</span>
                        </div>
                        
                        {/* Most Popular Courses */}
                        {categoryData.most_popular_first && (
                          <div className="mt-3 p-2 bg-green-50 rounded">
                            <p className="text-xs text-gray-600 mb-1">Most Popular 1st Choice:</p>
                            <p className="font-medium text-green-800 text-xs">
                              {categoryData.most_popular_first.course_name} ({categoryData.most_popular_first.count} students)
                            </p>
                          </div>
                        )}
                        
                        {categoryData.most_popular_second && (
                          <div className="mt-2 p-2 bg-blue-50 rounded">
                            <p className="text-xs text-gray-600 mb-1">Most Popular 2nd Choice:</p>
                            <p className="font-medium text-blue-800 text-xs">
                              {categoryData.most_popular_second.course_name} ({categoryData.most_popular_second.count} students)
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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Detailed Course Analysis</h3>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {Object.keys(selectedCourses).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(selectedCourses)
                    .sort(([,a], [,b]) => b.total_demand - a.total_demand)
                    .map(([courseId, courseData]) => (
                    <div key={courseId} className={`border rounded-lg p-4 ${getDemandColor(courseData.total_demand, maxDemand)}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{courseData.course_name}</h4>
                          <p className="text-sm opacity-75">Course ID: {courseId}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{courseData.total_demand}</div>
                          <div className="text-xs">Total Demand</div>
                          <div className="text-xs mt-1 px-2 py-1 bg-white bg-opacity-50 rounded">
                            {getDemandLevel(courseData.total_demand, maxDemand)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="font-medium">1st Choice ({courseData.first_choice_count})</span>
                          </div>
                          <div className="max-h-32 overflow-y-auto">
                            {courseData.students_first_choice.map((student, index) => (
                              <div key={index} className="text-xs py-1 px-2 bg-white bg-opacity-50 rounded mb-1">
                                {student.name} ({student.student_id})
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="font-medium">2nd Choice ({courseData.second_choice_count})</span>
                          </div>
                          <div className="max-h-32 overflow-y-auto">
                            {courseData.students_second_choice.map((student, index) => (
                              <div key={index} className="text-xs py-1 px-2 bg-white bg-opacity-50 rounded mb-1">
                                {student.name} ({student.student_id})
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Capacity Analysis */}
                      <div className="mt-3 pt-3 border-t border-white border-opacity-20">
                        <div className="flex justify-between text-sm">
                          <span>Expected Allocation Difficulty:</span>
                          <span className="font-medium">
                            {courseData.total_demand > 60 ? 'High Competition' :
                             courseData.total_demand > 40 ? 'Moderate Competition' :
                             courseData.total_demand >= 20 ? 'Should Run Successfully' :
                             'May Not Meet Minimum (20 students)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No course preferences found for {selectedCategory}
                </div>
              )}
            </div>
          )}

          {/* Students Mode */}
          {viewMode === 'students' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Student Preferences List</h3>
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  {filteredStudents.map((student, index) => (
                    <div key={student.student_id} className={`p-4 border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{student.name}</h4>
                          <p className="text-sm text-gray-600">ID: {student.student_id}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            student.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {student.status.toUpperCase()}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {student.total_preferences} categories completed
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        {categories.map(category => {
                          const prefs = student.preferences[category]
                          if (!prefs || (!prefs.choice1.id && !prefs.choice2.id)) return null
                          
                          return (
                            <div key={category} className="bg-gray-100 p-2 rounded">
                              <div className="font-medium text-gray-700 mb-1">{category}</div>
                              {prefs.choice1.id && (
                                <div className="flex items-center gap-1 mb-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="truncate">{prefs.choice1.name}</span>
                                </div>
                              )}
                              {prefs.choice2.id && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="truncate">{prefs.choice2.name}</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No students found matching your search.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Analytics