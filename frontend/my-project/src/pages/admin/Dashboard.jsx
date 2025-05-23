import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { triggerAllocation } from '../../services/api'

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pendingAllocations: 0,
    completedAllocations: 0
  })

  useEffect(() => {
    // Mock data - replace with actual API call
    setStats({
      totalSubmissions: 150,
      pendingAllocations: 50,
      completedAllocations: 100
    })
  }, [])

  const handleTriggerAllocation = async () => {
    try {
      await triggerAllocation()
      toast.success('Allocation process started successfully!')
    } catch (error) {
      toast.error('Failed to start allocation process')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <button
          onClick={handleTriggerAllocation}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary"
        >
          Start Allocation
        </button>
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