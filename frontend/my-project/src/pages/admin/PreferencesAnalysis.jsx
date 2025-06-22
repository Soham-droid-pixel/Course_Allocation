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
  const [currentTime, setCurrentTime] = useState(new Date())
  const [analytics, setAnalytics] = useState({
    totalStudents: 0,
    totalAllocated: 0,
    allocationRate: 0,
    preferenceSuccess: {
      firstChoice: 0,
      secondChoice: 0,
      alternative: 0,
      firstChoiceRate: 0,
      secondChoiceRate: 0,
      alternativeRate: 0
    },
    categoryStats: {},
    coursePopularity: {},
    satisfactionScore: 0,
    formulas: {}
  })

  // Update time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

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
    
    if (totalStudents === 0) return
    
    let firstChoiceCount = 0
    let secondChoiceCount = 0
    let alternativeCount = 0
    let totalAllocatedCourses = 0
    
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
        totalStudentsWithPrefs: 0,
        courses: {},
        firstChoiceRate: 0,
        secondChoiceRate: 0,
        alternativeRate: 0,
        allocationRate: 0
      }
    })

    // Analyze each student's allocations
    Object.entries(studentAllocations).forEach(([studentId, allocations]) => {
      const studentPrefs = preferences.student_details?.find(s => s.student_id === studentId)
      
      Object.entries(allocations).forEach(([category, courseId]) => {
        if (!categoryStats[category]) return
        
        categoryStats[category].allocated++
        totalAllocatedCourses++
        
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
          
          categoryStats[category].totalStudentsWithPrefs++
          
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
        } else {
          alternativeCount++
          categoryStats[category].alternative++
        }
      })
    })

    // CORRECTED CALCULATIONS - ALL CAPPED AT 100%
    const firstChoiceSuccessRate = Math.min(100, (firstChoiceCount / totalStudents) * 100)
    const secondChoiceSuccessRate = Math.min(100, (secondChoiceCount / totalStudents) * 100)
    const alternativeRate = Math.min(100, (alternativeCount / totalStudents) * 100)
    const confirmedStudents = preferences.summary?.confirmed_students || totalStudents
    const allocationRate = Math.min(100, (totalStudents / confirmedStudents) * 100)
    const maxPossibleScore = totalStudents * 100
    const actualScore = (firstChoiceCount * 100) + (secondChoiceCount * 70) + (alternativeCount * 40)
    const satisfactionScore = Math.min(100, (actualScore / maxPossibleScore) * 100)

    // Calculate category-wise success rates
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category]
      const categoryTotal = stats.allocated
      
      if (categoryTotal > 0) {
        stats.firstChoiceRate = Math.min(100, (stats.firstChoice / categoryTotal) * 100)
        stats.secondChoiceRate = Math.min(100, (stats.secondChoice / categoryTotal) * 100)
        stats.alternativeRate = Math.min(100, (stats.alternative / categoryTotal) * 100)
        stats.allocationRate = Math.min(100, (categoryTotal / totalStudents) * 100)
      }
    })

    setAnalytics({
      totalStudents,
      totalAllocated: totalStudents,
      allocationRate: Math.round(allocationRate * 100) / 100,
      preferenceSuccess: {
        firstChoice: firstChoiceCount,
        secondChoice: secondChoiceCount,
        alternative: alternativeCount,
        firstChoiceRate: Math.round(firstChoiceSuccessRate * 100) / 100,
        secondChoiceRate: Math.round(secondChoiceSuccessRate * 100) / 100,
        alternativeRate: Math.round(alternativeRate * 100) / 100
      },
      categoryStats,
      coursePopularity,
      satisfactionScore: Math.round(satisfactionScore * 100) / 100,
      formulas: {
        firstChoiceSuccess: `(${firstChoiceCount} ÷ ${totalStudents}) × 100 = ${Math.round(firstChoiceSuccessRate * 100) / 100}%`,
        secondChoiceSuccess: `(${secondChoiceCount} ÷ ${totalStudents}) × 100 = ${Math.round(secondChoiceSuccessRate * 100) / 100}%`,
        satisfactionScore: `[(${firstChoiceCount} × 100) + (${secondChoiceCount} × 70) + (${alternativeCount} × 40)] ÷ (${totalStudents} × 100) × 100 = ${Math.round(satisfactionScore * 100) / 100}%`,
        allocationRate: `(${totalStudents} ÷ ${confirmedStudents}) × 100 = ${Math.round(allocationRate * 100) / 100}%`,
        weightingSystem: "1st Choice = 100 points, 2nd Choice = 70 points, Alternative = 40 points"
      }
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

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
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
      .map(course => course.name.length > 15 ? course.name.substring(0, 15) + '...' : course.name),
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
          padding: 15,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
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
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 0
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading analytics...</p>
          <p className="text-sm text-gray-500 mt-2">Analyzing allocation data...</p>
        </div>
      </div>
    )
  }

  if (!allocationData?.student_allocations) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">No Allocation Data Available</h3>
            <p className="text-gray-600 text-base sm:text-lg mb-6 max-w-md mx-auto">
              No allocation has been completed yet. Run the allocation process first to see comprehensive analytics.
            </p>
            <button
              onClick={fetchAllData}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Fixed tabs array
  const tabs = [
    { key: 'overview', label: '📊 Overview', desc: 'Key metrics & charts' },
    { key: 'preferences', label: '🎯 Preference Analysis', desc: 'Success rates' },
    { key: 'categories', label: '📚 Category Breakdown', desc: 'Course categories' },
    { key: 'courses', label: '🏆 Popular Courses', desc: 'Most demanded' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                📊 Post-Allocation Analytics
              </h1>
              <p className="text-blue-100 text-sm sm:text-base mb-3">
                {getGreeting()}, Professor! Comprehensive analysis of allocation results
              </p>
              <p className="text-blue-100 text-sm">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} • {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAllData}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-1">📈</div>
                <p className="text-blue-100 text-xs font-medium">Analytics Hub</p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-lg">👥</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{analytics.totalStudents}</p>
            <p className="text-blue-100 text-sm">Students Allocated</p>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-lg">✅</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Max: 100%</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{analytics.allocationRate}%</p>
            <p className="text-green-100 text-sm">Allocation Rate</p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-lg">🎯</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Max: 100%</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{analytics.preferenceSuccess.firstChoiceRate}%</p>
            <p className="text-purple-100 text-sm">1st Choice Success</p>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-lg">⭐</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Max: 100%</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{analytics.satisfactionScore}%</p>
            <p className="text-orange-100 text-sm">Satisfaction Score</p>
          </div>
        </div>

        {/* Formula Explanation */}
        {analytics.formulas && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">🧮</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Calculation Formulas</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <span className="font-medium text-green-700 block mb-1">🎯 First Choice Success Rate:</span>
                  <div className="text-gray-600 font-mono text-xs bg-white p-2 rounded border">
                    {analytics.formulas.firstChoiceSuccess}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <span className="font-medium text-blue-700 block mb-1">🎲 Second Choice Success Rate:</span>
                  <div className="text-gray-600 font-mono text-xs bg-white p-2 rounded border">
                    {analytics.formulas.secondChoiceSuccess}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <span className="font-medium text-purple-700 block mb-1">⭐ Satisfaction Score (Weighted):</span>
                  <div className="text-gray-600 font-mono text-xs bg-white p-2 rounded border">
                    {analytics.formulas.satisfactionScore}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    {analytics.formulas.weightingSystem}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <span className="font-medium text-orange-700 block mb-1">📊 Allocation Rate:</span>
                  <div className="text-gray-600 font-mono text-xs bg-white p-2 rounded border">
                    {analytics.formulas.allocationRate}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <p className="text-sm text-blue-800 font-medium mb-2">📋 Important Notes:</p>
              <ul className="text-sm text-blue-700 space-y-1 pl-4">
                <li>• All percentages are automatically <strong>capped at 100% maximum</strong></li>
                <li>• Satisfaction Score uses weighted scoring for preference quality</li>
                <li>• Higher scores indicate better allocation success</li>
                <li>• All calculations are rounded to 2 decimal places</li>
              </ul>
            </div>
          </div>
        )}

        {/* Mobile-First Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            {/* Mobile Tab Selector */}
            <div className="sm:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full p-4 border-0 bg-white text-gray-900 font-medium focus:ring-0"
              >
                {tabs.map(tab => (
                  <option key={tab.key} value={tab.key}>
                    {tab.label} - {tab.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Tab Navigation */}
            <nav className="hidden sm:flex overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-4 sm:px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">{tab.label}</div>
                    <div className="text-xs opacity-75 hidden lg:block">{tab.desc}</div>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Allocation Success Rate */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span>📈</span>
                      <span>Allocation Success Rate</span>
                    </h3>
                    <div className="h-64 sm:h-72">
                      <Doughnut data={allocationRateChartData} options={chartOptions} />
                    </div>
                  </div>

                  {/* Preference Satisfaction */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span>🎯</span>
                      <span>Preference Satisfaction</span>
                    </h3>
                    <div className="h-64 sm:h-72">
                      <Pie data={preferenceSuccessChartData} options={chartOptions} />
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <span className="text-xl">✅</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-600">First Choice Success</p>
                        <p className="text-2xl font-bold text-green-900">{analytics.preferenceSuccess.firstChoiceRate}%</p>
                        <p className="text-xs text-green-600">
                          {analytics.preferenceSuccess.firstChoice} out of {analytics.totalStudents} students
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <span className="text-xl">🎲</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-600">Second Choice Success</p>
                        <p className="text-2xl font-bold text-blue-900">{analytics.preferenceSuccess.secondChoiceRate}%</p>
                        <p className="text-xs text-blue-600">
                          {analytics.preferenceSuccess.secondChoice} out of {analytics.totalStudents} students
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <span className="text-xl">⚠️</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-600">Alternative Allocation</p>
                        <p className="text-2xl font-bold text-orange-900">{analytics.preferenceSuccess.alternativeRate}%</p>
                        <p className="text-xs text-orange-600">
                          {analytics.preferenceSuccess.alternative} out of {analytics.totalStudents} students
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
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span>📊</span>
                      <span>Preference Success Distribution</span>
                    </h3>
                    <div className="h-64 sm:h-80">
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
                            x: { 
                              stacked: true,
                              ticks: {
                                maxRotation: 45,
                                font: { size: 10 }
                              }
                            },
                            y: { stacked: true }
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span>📈</span>
                      <span>Category Success Rates</span>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Max: 100%</span>
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {Object.entries(analytics.categoryStats).map(([category, stats]) => {
                        const total = stats.firstChoice + stats.secondChoice + stats.alternative
                        const successRate = total > 0 ? Math.min(100, ((stats.firstChoice + stats.secondChoice) / total * 100)) : 0
                        
                        return (
                          <div key={category} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                              <h4 className="font-medium text-gray-900">{category}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium self-start sm:self-auto ${
                                successRate >= 80 ? 'bg-green-100 text-green-800' :
                                successRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {successRate.toFixed(1)}% Success
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-center">
                                <div className="text-green-600 font-semibold text-lg">{stats.firstChoice}</div>
                                <div className="text-gray-500 text-xs">1st Choice</div>
                                <div className="text-xs text-gray-400">{stats.firstChoiceRate.toFixed(1)}%</div>
                              </div>
                              <div className="text-center">
                                <div className="text-blue-600 font-semibold text-lg">{stats.secondChoice}</div>
                                <div className="text-gray-500 text-xs">2nd Choice</div>
                                <div className="text-xs text-gray-400">{stats.secondChoiceRate.toFixed(1)}%</div>
                              </div>
                              <div className="text-center">
                                <div className="text-orange-600 font-semibold text-lg">{stats.alternative}</div>
                                <div className="text-gray-500 text-xs">Alternative</div>
                                <div className="text-xs text-gray-400">{stats.alternativeRate.toFixed(1)}%</div>
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

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span>📚</span>
                    <span>Students Allocated per Category</span>
                  </h3>
                  <div className="h-64 sm:h-80">
                    <Bar data={categoryDistributionData} options={barChartOptions} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Object.entries(analytics.categoryStats).map(([category, stats]) => (
                    <div key={category} className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="text-lg">📖</span>
                        <span>{category}</span>
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Allocated:</span>
                          <span className="font-medium">{stats.allocated}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Allocation Rate:</span>
                          <span className="font-medium">{stats.allocationRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Unique Courses:</span>
                          <span className="font-medium">{Object.keys(stats.courses).length}</span>
                        </div>
                        <div className="mt-3">
                          <h5 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <span>🏆</span>
                            <span>Top Courses:</span>
                          </h5>
                          <div className="space-y-1">
                            {Object.entries(stats.courses)
                              .sort(([,a], [,b]) => b - a)
                              .slice(0, 3)
                              .map(([courseId, count]) => (
                                <div key={courseId} className="flex justify-between text-xs bg-gray-50 rounded p-2">
                                  <span className="text-gray-600 truncate flex-1 mr-2">
                                    {getCourseNameFromId(courseId)}
                                  </span>
                                  <span className="font-medium text-blue-600">{count}</span>
                                </div>
                              ))}
                          </div>
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
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span>🏆</span>
                    <span>Top 10 Most Popular Courses</span>
                  </h3>
                  <div className="h-64 sm:h-80">
                    <Bar data={topCoursesData} options={barChartOptions} />
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span>🥇</span>
                      <span>Course Enrollment Rankings</span>
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {Object.entries(analytics.coursePopularity)
                        .sort(([,a], [,b]) => b.count - a.count)
                        .map(([courseId, course], index) => (
                          <div key={courseId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{course.name}</p>
                                <p className="text-xs text-gray-500">{course.category}</p>
                              </div>
                            </div>
                            <span className="font-semibold text-blue-600 text-lg">{course.count}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span>📊</span>
                      <span>Category Performance</span>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">All Capped at 100%</span>
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(analytics.categoryStats)
                        .sort(([,a], [,b]) => b.allocated - a.allocated)
                        .map(([category, stats]) => {
                          const total = stats.allocated
                          const successRate = total > 0 ? Math.min(100, ((stats.firstChoice + stats.secondChoice) / total * 100)) : 0
                          
                          return (
                            <div key={category} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                <h4 className="font-medium">{category}</h4>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-semibold text-blue-600">{total} students</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-600">
                                  <span>Success Rate: {successRate.toFixed(1)}%</span>
                                  <span>Courses: {Object.keys(stats.courses).length}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                                    style={{ width: `${Math.min(100, successRate)}%` }}
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
    </div>
  )
}

export default PreferenceAnalysis