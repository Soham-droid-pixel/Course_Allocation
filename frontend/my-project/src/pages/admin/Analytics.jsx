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
  const [stats, setStats] = useState({
    courseEnrollments: {},
    categoryStats: {},
    preferenceStats: {
      firstChoice: 0,
      secondChoice: 0,
      notAllocated: 0
    }
  })

  useEffect(() => {
    // Mock data - replace with actual API call
    const fetchAnalytics = async () => {
      try {
        // Simulated API response
        const data = {
          courseEnrollments: {
            'Blockchain': 45,
            'Cloud Computing': 60,
            'Deep Learning': 55,
            'Cybersecurity': 40,
            'IoT': 35
          },
          categoryStats: {
            'PECL1': 150,
            'PECL2': 145,
            'OPEN': 80,
            'MDM': 160
          },
          preferenceStats: {
            firstChoice: 280,
            secondChoice: 95,
            notAllocated: 25
          }
        }
        setStats(data)
      } catch (error) {
        toast.error('Failed to fetch analytics data')
      }
    }

    fetchAnalytics()
  }, [])

  const courseEnrollmentChart = {
    labels: Object.keys(stats.courseEnrollments),
    datasets: [
      {
        label: 'Number of Students',
        data: Object.values(stats.courseEnrollments),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  }

  const preferenceChart = {
    labels: ['First Choice', 'Second Choice', 'Not Allocated'],
    datasets: [
      {
        data: [
          stats.preferenceStats.firstChoice,
          stats.preferenceStats.secondChoice,
          stats.preferenceStats.notAllocated
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(255, 99, 132, 0.5)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }
    ]
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Allocation Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(stats.categoryStats).map(([category, count]) => (
          <div key={category} className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">{category}</h3>
            <p className="text-3xl font-bold text-blue-600">{count}</p>
            <p className="text-sm text-gray-500">Total Allocations</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Course-wise Enrollment</h3>
          <Bar 
            data={courseEnrollmentChart}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top'
                }
              },
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Preference Distribution</h3>
          <Pie 
            data={preferenceChart}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top'
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default Analytics