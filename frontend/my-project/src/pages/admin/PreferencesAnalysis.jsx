import { useState, useEffect } from 'react'
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js'
import { toast } from 'react-hot-toast'
import { getLatestAllocation, getPreferencesAnalysis } from '../../services/api'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

function PreferenceAnalysis() {
  const [allocationData, setAllocationData] = useState(null)
  const [preferencesData, setPreferencesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [analytics, setAnalytics] = useState({
    totalStudents: 0,
    totalAllocated: 0,
    allocationRate: 0,
    preferenceSuccess: {
      firstChoice: 0,
      secondChoice: 0,
      alternative: 0
    },
    categoryStats: {},
    coursePopularity: {},
    satisfactionScore: 0
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [allocation, preferences] = await Promise.all([
        getLatestAllocation(),
        getPreferencesAnalysis()
      ])
      
      setAllocationData(allocation)
      setPreferencesData(preferences)
      generateAnalytics(allocation, preferences)
      
    } catch (error) {
      toast.error('Failed to fetch analytics data')
      console.error('Analytics fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAnalytics = (allocation, preferences) => {
    if (!allocation?.student_allocations || !preferences) return

    const studentAllocations = allocation.student_allocations
    const totalStudents = Object.keys(studentAllocations).length
    
    let firstChoiceCount = 0
    let secondChoiceCount = 0
    let alternativeCount = 0
    
    const categoryStats = {}
    const coursePopularity = {}
    
    // Initialize category stats
    const categories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM', 'Honors', 'Minor']
    categories.forEach(cat => {
      categoryStats[cat] = {
        allocated: 0,
        firstChoice: 0,
        secondChoice: 0,
        alternative: 0,
        courses: {}
      }
    })

    // Analyze each student's allocations
    Object.entries(studentAllocations).forEach(([studentId, allocations]) => {
      const studentPrefs = preferences.student_details?.find(s => s.student_id === studentId)
      
      Object.entries(allocations).forEach(([category, courseId]) => {
        if (!categoryStats[category]) return
        
        categoryStats[category].allocated++
        
        // Track course popularity
        if (!coursePopularity[courseId]) {
          coursePopularity[courseId] = {
            name: getCourseNameFromId(courseId),
            category: category,
            count: 0
          }
        }
        coursePopularity[courseId].count++
        
        // Count by category
        if (!categoryStats[category].courses[courseId]) {
          categoryStats[category].courses[courseId] = 0
        }
        categoryStats[category].courses[courseId]++
        
        // Determine preference level
        if (studentPrefs?.preferences[category]) {
          const prefs = studentPrefs.preferences[category]
          const choice1 = prefs.choice1?.id
          const choice2 = prefs.choice2?.id
          
          if (courseId === choice1) {
            firstChoiceCount++
            categoryStats[category].firstChoice++
          } else if (courseId === choice2) {
            secondChoiceCount++
            categoryStats[category].secondChoice++
          } else {
            alternativeCount++
            categoryStats[category].alternative++
          }
        }
      })
    })

    const satisfactionScore = totalStudents > 0 
      ? ((firstChoiceCount * 100 + secondChoiceCount * 70 + alternativeCount * 40) / (totalStudents * 100))
      : 0

    setAnalytics({
      totalStudents,
      totalAllocated: totalStudents,
      allocationRate: (totalStudents / (preferences.summary?.confirmed_students || 1)) * 100,
      preferenceSuccess: {
        firstChoice: firstChoiceCount,
        secondChoice: secondChoiceCount,
        alternative: alternativeCount
      },
      categoryStats,
      coursePopularity,
      satisfactionScore: satisfactionScore * 100
    })
  }

  const getCourseNameFromId = (courseId) => {
    const courseNames = {
      '25PECL13CE11': 'Image Processing Lab',
      '25PECL13CE12': 'NLP Lab',
      '25PECL13CE13': 'IIOT Lab',
      '25PECL13CE14': 'Product Development Lab-1',
      '25PECL13CE15': 'Open-Source Intelligence Lab',
      '25PECL13CE21': 'Social Media Analytics Lab',
      '25PECL13CE22': 'Ethical Hacking Lab',
      '25PECL13CE23': 'DevOps Lab',
      '25PECL13CE24': 'Product Development Lab-2',
      '25PECL13CE25': 'Explainable AI Lab',
      '25PECL13CE26': 'Software Testing Lab',
      '25PEC13CE11': 'Blockchain Technology',
      '25PEC13CE12': 'Deep Learning & RL',
      '25PEC13CE13': 'Cyber Security',
      '25PEC13CE14': 'Big Data Analytics',
      '25PEC13CE15': 'Computer Graphics',
      '25PEC13CE16': 'HMI',
      '25PEC13CE17': 'GIS',
      'OE1': 'Advanced Microprocessor',
      'OE2': 'Internet of Things',
      'OE3': 'E-Vehicle',
      'OE4': 'Supply Chain Management',
      'OE5': 'Design of Experiments',
      'OE6': '3D Printing',
      'H1': 'IoT Honors',
      'H2': 'AI/ML Honors',
      'H3': 'Data Science Honors',
      'H4': 'Blockchain Honors',
      'H5': 'Cybersecurity Honors',
      'M1': 'Robotics Minor',
      'M2': '3D Printing Minor',
      'MDM1': 'Emotional Intelligence',
      'MDM2': 'Health & Psychology'
    }
    return courseNames[courseId] || courseId
  }

  // Chart configurations
  const preferenceSuccessChartData = {
    labels: ['1st Choice', '2nd Choice', 'Alternative'],
    datasets: [{
      data: [
        analytics.preferenceSuccess.firstChoice,
        analytics.preferenceSuccess.secondChoice,
        analytics.preferenceSuccess.alternative
      ],
      backgroundColor: ['#10B981', '#3B82F6', '#F59E0B'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  }

  const allocationRateChartData = {
    labels: ['Allocated', 'Not Allocated'],
    datasets: [{
      data: [
        analytics.totalAllocated,
        Math.max(0, (preferencesData?.summary?.confirmed_students || 0) - analytics.totalAllocated)
      ],
      backgroundColor: ['#059669', '#DC2626'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  }

  const categoryDistributionData = {
    labels: Object.keys(analytics.categoryStats),
    datasets: [{
      label: 'Students Allocated',
      data: Object.values(analytics.categoryStats).map(stat => stat.allocated),
      backgroundColor: [
        '#8B5CF6', '#06B6D4', '#84CC16', 
        '#F59E0B', '#EF4444', '#EC4899', '#6366F1'
      ],
      borderWidth: 1
    }]
  }

  const topCoursesData = {
    labels: Object.values(analytics.coursePopularity)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(course => course.name),
    datasets: [{
      label: 'Students Enrolled',
      data: Object.values(analytics.coursePopularity)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(course => course.count),
      backgroundColor: '#3B82F6',
      borderColor: '#1D4ED8',
      borderWidth: 1
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      }
    }
  }

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#F3F4F6'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!allocationData?.student_allocations) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Allocation Data</h3>
        <p className="text-gray-600">No allocation has been completed yet. Run allocation first to see analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Post-Allocation Analytics</h2>
          <p className="text-gray-600">
            Comprehensive analysis of allocation results and student satisfaction
          </p>
        </div>
        <button
          onClick={fetchAllData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
          <h3 className="text-sm font-medium opacity-90">Total Students</h3>
          <p className="text-3xl font-bold">{analytics.totalStudents}</p>
          <p className="text-sm opacity-75">Successfully Allocated</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
          <h3 className="text-sm font-medium opacity-90">Allocation Rate</h3>
          <p className="text-3xl font-bold">{analytics.allocationRate.toFixed(1)}%</p>
          <p className="text-sm opacity-75">Of Confirmed Students</p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
          <h3 className="text-sm font-medium opacity-90">1st Choice Success</h3>
          <p className="text-3xl font-bold">
            {analytics.totalStudents > 0 
              ? ((analytics.preferenceSuccess.firstChoice / analytics.totalStudents) * 100).toFixed(1)
              : 0}%
          </p>
          <p className="text-sm opacity-75">{analytics.preferenceSuccess.firstChoice} Students</p>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
          <h3 className="text-sm font-medium opacity-90">Satisfaction Score</h3>
          <p className="text-3xl font-bold">{analytics.satisfactionScore.toFixed(1)}%</p>
          <p className="text-sm opacity-75">Overall Happiness</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: '📊 Overview', desc: 'Key metrics & charts' },
              { key: 'preferences', label: '🎯 Preference Analysis', desc: 'Success rates' },
              { key: 'categories', label: '📚 Category Breakdown', desc: 'Course categories' },
              { key: 'courses', label: '🏆 Popular Courses', desc: 'Most demanded' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="text-center">
                  <div>{tab.label}</div>
                  <div className="text-xs opacity-75">{tab.desc}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Allocation Success Rate */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Allocation Success Rate</h3>
                  <div className="h-64">
                    <Doughnut data={allocationRateChartData} options={chartOptions} />
                  </div>
                </div>

                {/* Preference Satisfaction */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Preference Satisfaction</h3>
                  <div className="h-64">
                    <Pie data={preferenceSuccessChartData} options={chartOptions} />
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-600">First Choice</p>
                      <p className="text-2xl font-semibold text-green-900">
                        {analytics.preferenceSuccess.firstChoice}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-600">Second Choice</p>
                      <p className="text-2xl font-semibold text-blue-900">
                        {analytics.preferenceSuccess.secondChoice}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-orange-600">Alternative</p>
                      <p className="text-2xl font-semibold text-orange-900">
                        {analytics.preferenceSuccess.alternative}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Preference Success Distribution</h3>
                  <div className="h-80">
                    <Bar 
                      data={{
                        labels: Object.keys(analytics.categoryStats),
                        datasets: [
                          {
                            label: '1st Choice',
                            data: Object.values(analytics.categoryStats).map(stat => stat.firstChoice),
                            backgroundColor: '#10B981'
                          },
                          {
                            label: '2nd Choice', 
                            data: Object.values(analytics.categoryStats).map(stat => stat.secondChoice),
                            backgroundColor: '#3B82F6'
                          },
                          {
                            label: 'Alternative',
                            data: Object.values(analytics.categoryStats).map(stat => stat.alternative),
                            backgroundColor: '#F59E0B'
                          }
                        ]
                      }}
                      options={{
                        ...barChartOptions,
                        scales: {
                          ...barChartOptions.scales,
                          x: { stacked: true },
                          y: { stacked: true }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Category-wise Success Rates</h3>
                  {Object.entries(analytics.categoryStats).map(([category, stats]) => {
                    const total = stats.firstChoice + stats.secondChoice + stats.alternative
                    const successRate = total > 0 ? ((stats.firstChoice + stats.secondChoice) / total * 100) : 0
                    
                    return (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{category}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            successRate >= 80 ? 'bg-green-100 text-green-800' :
                            successRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {successRate.toFixed(1)}% Success
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="text-center">
                            <div className="text-green-600 font-semibold">{stats.firstChoice}</div>
                            <div className="text-gray-500">1st Choice</div>
                          </div>
                          <div className="text-center">
                            <div className="text-blue-600 font-semibold">{stats.secondChoice}</div>
                            <div className="text-gray-500">2nd Choice</div>
                          </div>
                          <div className="text-center">
                            <div className="text-orange-600 font-semibold">{stats.alternative}</div>
                            <div className="text-gray-500">Alternative</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Students Allocated per Category</h3>
                <div className="h-80">
                  <Bar data={categoryDistributionData} options={barChartOptions} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analytics.categoryStats).map(([category, stats]) => (
                  <div key={category} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">{category}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Allocated:</span>
                        <span className="font-medium">{stats.allocated}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Unique Courses:</span>
                        <span className="font-medium">{Object.keys(stats.courses).length}</span>
                      </div>
                      <div className="mt-3">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">Top Courses:</h5>
                        {Object.entries(stats.courses)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 3)
                          .map(([courseId, count]) => (
                            <div key={courseId} className="flex justify-between text-xs">
                              <span className="text-gray-600 truncate">
                                {getCourseNameFromId(courseId)}
                              </span>
                              <span className="font-medium ml-2">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Courses Tab */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Top 10 Most Popular Courses</h3>
                <div className="h-80">
                  <Bar data={topCoursesData} options={barChartOptions} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Course Enrollment Rankings</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {Object.entries(analytics.coursePopularity)
                      .sort(([,a], [,b]) => b.count - a.count)
                      .map(([courseId, course], index) => (
                        <div key={courseId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <div className="flex items-center">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                              index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium text-sm">{course.name}</p>
                              <p className="text-xs text-gray-500">{course.category}</p>
                            </div>
                          </div>
                          <span className="font-semibold text-blue-600">{course.count}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Category Performance</h3>
                  <div className="space-y-4">
                    {Object.entries(analytics.categoryStats)
                      .sort(([,a], [,b]) => b.allocated - a.allocated)
                      .map(([category, stats]) => {
                        const total = stats.allocated
                        const successRate = total > 0 ? ((stats.firstChoice + stats.secondChoice) / total * 100) : 0
                        
                        return (
                          <div key={category} className="border-l-4 border-blue-500 pl-4">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">{category}</h4>
                              <span className="text-sm font-semibold text-blue-600">{total} students</span>
                            </div>
                            <div className="mt-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Success Rate: {successRate.toFixed(1)}%</span>
                                <span>Courses: {Object.keys(stats.courses).length}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${successRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PreferenceAnalysis;