import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { triggerAllocation, downloadReport, getStats } from '../../services/api'

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pendingAllocations: 0,
    completedAllocations: 0
  })
  const [isAllocating, setIsAllocating] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const data = await getStats()
      setStats(data)
    } catch (error) {
      console.error('Stats fetch error:', error)
      toast.error('Failed to fetch statistics')
    }
  }

  const handleTriggerAllocation = async () => {
    try {
      setIsAllocating(true)
      
      console.log('Starting allocation...')
      const result = await triggerAllocation()
      console.log('Allocation result:', result)
      
      if (result && result.allocation_id) {
        toast.success(`Allocation completed! ${result.student_allocations?.length || 0} students allocated`)
        await fetchStats()
      } else {
        throw new Error('Invalid allocation result - missing allocation_id')
      }
    } catch (error) {
      console.error('Allocation error details:', error)
      
      // More specific error messages
      if (error.message.includes('fetch')) {
        toast.error('Network error: Could not connect to server')
      } else if (error.message.includes('404')) {
        toast.error('Allocation endpoint not found')
      } else if (error.message.includes('500')) {
        toast.error('Server error during allocation')
      } else {
        toast.error(error.message || 'Failed to complete allocation')
      }
    } finally {
      setIsAllocating(false)
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
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={stats.totalSubmissions === 0}
            >
              Start Allocation
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
              <span>Allocating courses...</span>
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
    </div>
  )
}

export default AdminDashboard