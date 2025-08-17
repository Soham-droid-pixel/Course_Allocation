/*Purpose: Allows admins to view and download the latest course allocation report in Excel or CSV format.

State managed:

selectedFormat: either "excel" or "csv".

loading: shows download progress.

error: stores any error messages.

allocationId: the latest allocation identifier.

currentTime: updates every minute for live date/time display.

Effects (useEffect):

Updates currentTime every minute.

Fetches the latest allocation on mount using fetchLatestAllocation().

Functions:

fetchLatestAllocation(): gets the most recent allocation ID from server and updates allocationId or shows error if none found.

handleDownload(): triggers report download in the selected format. Shows loading spinner and handles errors (like incomplete allocations).

getGreeting(): returns “Good Morning/Afternoon/Evening” based on the current time.

UI Structure:

Header: greeting, current date, and report center icon.

Report Card: shows format selection (Excel/CSV) and action buttons to download or refresh.

Status Messages: shows green success box if allocation found, red error box if issues occur.*/
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { downloadReport, getLatestAllocation } from '../../services/api'

function Reports() {
  const [selectedFormat, setSelectedFormat] = useState('excel')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [allocationId, setAllocationId] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Fetch latest allocation on component mount
  useEffect(() => {
    fetchLatestAllocation()
  }, [])

  const fetchLatestAllocation = async () => {
    try {
      const allocation = await getLatestAllocation()
      if (allocation?.allocation_id) {
        setAllocationId(allocation.allocation_id)
        setError(null)
      } else {
        setError('No valid allocation found')
      }
    } catch (error) {
      console.error('Error fetching latest allocation:', error)
      setError('Failed to fetch latest allocation')
      toast.error('Failed to fetch latest allocation')
    }
  }

  const handleDownload = async () => {
    if (!allocationId) {
      setError('No allocation found to download')
      toast.error('No allocation found to download')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await downloadReport(allocationId, selectedFormat)
      toast.success('Report downloaded successfully')
    } catch (error) {
      const message = error.message.includes('incomplete') 
        ? 'Cannot download report: Allocation is incomplete - all courses must have students'
        : error.message
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-green-600 via-blue-600 to-purple-600 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                📈 Allocation Reports
              </h1>
              <p className="text-blue-100 text-sm sm:text-base mb-3">
                {getGreeting()}, Administrator! Generate and download allocation reports
              </p>
              <p className="text-blue-100 text-sm">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex-shrink-0 text-center">
              <div className="text-4xl sm:text-5xl mb-2">📊</div>
              <p className="text-blue-100 text-sm font-medium">Report Center</p>
            </div>
          </div>
        </div>

        {/* Main Report Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Download Allocation Report</h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Generate comprehensive reports of student course allocations
            </p>
          </div>

          {/* Report Configuration */}
          <div className="max-w-md mx-auto space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                📄 Report Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedFormat('excel')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selectedFormat === 'excel'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-center">
                    <div className="font-semibold">Excel</div>
                    <div className="text-xs opacity-75">.xlsx</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedFormat('csv')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selectedFormat === 'csv'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-center">
                    <div className="font-semibold">CSV</div>
                    <div className="text-xs opacity-75">.csv</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownload}
                disabled={loading || !allocationId}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download Report</span>
                  </>
                )}
              </button>

              <button
                onClick={fetchLatestAllocation}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
                title="Refresh allocation data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {allocationId && !error && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-green-800 mb-1">Allocation Found</h3>
                  <p className="text-sm text-green-700">
                    You have selected the allocation for {new Date(allocationId).toLocaleString('default', { month: 'long', year: 'numeric' })}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reports