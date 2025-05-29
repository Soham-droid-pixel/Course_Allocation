import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { triggerAllocation, downloadReport } from '../../services/api'

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pendingAllocations: 0,
    completedAllocations: 0
  })
  const [isAllocating, setIsAllocating] = useState(false)
  const [allocationId, setAllocationId] = useState(null)
  const [allocationStatus, setAllocationStatus] = useState(null)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      toast.error('Failed to fetch statistics')
    }
  }

  const handleTriggerAllocation = async () => {
  try {
    setIsAllocating(true);
    setAllocationStatus('pending');
    
    const result = await triggerAllocation();
    
    setAllocationId(result.allocation_id);
    setAllocationStatus('completed');
    toast.success('Allocation completed successfully!');
    await fetchStats();
  } catch (error) {
    console.error('Allocation error:', error);
    toast.error(error.message || 'Failed to complete allocation');
    setAllocationStatus('failed');
  } finally {
    setIsAllocating(false);
  }
};
  const handleDownloadReport = async (format) => {
    if (!allocationId) {
      toast.error('No allocation available to download')
      return
    }

    try {
      setIsDownloading(true);
      await downloadReport(allocationId, format);
      toast.success(`Report downloaded in ${format} format`)
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <div className="space-x-4">
          {!isAllocating ? (
            <button
              onClick={handleTriggerAllocation}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              disabled={stats.pendingAllocations === 0}
            >
              Start Allocation
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
              <span>Allocating...</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500">Total Submissions</h3>
          <p className="text-3xl font-bold">{stats.totalSubmissions}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500">Pending Allocations</h3>
          <p className="text-3xl font-bold">{stats.pendingAllocations}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500">Completed Allocations</h3>
          <p className="text-3xl font-bold">{stats.completedAllocations}</p>
        </div>
      </div>

      {allocationStatus === 'completed' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Latest Allocation Results</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => handleDownloadReport('excel')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              disabled={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download Excel Report'}
            </button>
            <button
              onClick={() => handleDownloadReport('csv')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download CSV Report'}
            </button>
          </div>
        </div>
      )}

      {allocationStatus === 'failed' && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Allocation failed. Please try again or contact support if the problem persists.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard