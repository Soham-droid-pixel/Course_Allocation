import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { downloadReport, getLatestAllocation } from '../../services/api'

function Reports() {
  const [selectedFormat, setSelectedFormat] = useState('excel')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [allocationId, setAllocationId] = useState(null)

  // Fetch latest allocation on component mount
  useEffect(() => {
    fetchLatestAllocation()
  }, [])

  const fetchLatestAllocation = async () => {
    try {
      const allocation = await getLatestAllocation()
      if (allocation?.allocation_id) {
        setAllocationId(allocation.allocation_id)
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Allocation Reports</h2>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
          </select>

          <button
            onClick={handleDownload}
            disabled={loading || !allocationId}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Downloading...' : 'Download Report'}
          </button>

          <button
            onClick={fetchLatestAllocation}
            disabled={loading}
            className="text-blue-600 hover:text-blue-700"
            title="Refresh allocation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default Reports