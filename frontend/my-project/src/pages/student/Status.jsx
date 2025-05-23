import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { COURSE_TYPES } from '../../utils/constants'

function Status() {
  const [allocations, setAllocations] = useState({
    PECL1: null,
    PECL2: null,
    OPEN: null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock API call - replace with actual API integration
    const fetchAllocations = async () => {
      try {
        // Simulated API response
        const mockData = {
          PECL1: {
            courseName: 'Blockchain Technology',
            status: 'allocated',
            preference: 1
          },
          PECL2: {
            courseName: 'Cloud Computing',
            status: 'allocated',
            preference: 2
          },
          OPEN: {
            courseName: 'IoT Systems',
            status: 'pending',
            preference: 1
          }
        }
        
        setAllocations(mockData)
      } catch (error) {
        toast.error('Failed to fetch allocation status')
      } finally {
        setLoading(false)
      }
    }

    fetchAllocations()
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'allocated':
        return 'text-green-600'
      case 'pending':
        return 'text-yellow-600'
      default:
        return 'text-red-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading allocation status...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <h2 className="text-2xl font-bold mb-6">Course Allocation Status</h2>
      
      <div className="space-y-6">
        {Object.entries(COURSE_TYPES).map(([key, title]) => (
          <div key={key} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            
            {allocations[key] ? (
              <div className="space-y-2">
                <p className="text-gray-700">
                  Course: <span className="font-medium">{allocations[key].courseName}</span>
                </p>
                <p className="text-gray-700">
                  Status: {' '}
                  <span className={`font-medium ${getStatusColor(allocations[key].status)}`}>
                    {allocations[key].status.toUpperCase()}
                  </span>
                </p>
                {allocations[key].preference && (
                  <p className="text-gray-700">
                    Your Preference: <span className="font-medium">{allocations[key].preference}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No allocation information available</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          Note: Allocation status is updated periodically. Please check back later if your status is pending.
        </p>
      </div>
    </div>
  )
}

export default Status