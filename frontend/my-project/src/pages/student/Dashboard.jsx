import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import CourseCard from '../../components/student/CourseCard'
import { COURSES } from '../../utils/constants'

function StudentDashboard() {
  const [allocatedCourses, setAllocatedCourses] = useState([])

  useEffect(() => {
    // Fetch allocated courses from API
    // This is a mock implementation
    setAllocatedCourses([
      { ...COURSES.PECL1[0], status: 'allocated' },
      { ...COURSES.PECL2[1], status: 'pending' }
    ])
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Student Dashboard</h2>
        <Link
          to="/student/preferences"
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary"
        >
          Submit Preferences
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allocatedCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            selected={course.status === 'allocated'}
          />
        ))}
      </div>

      {allocatedCourses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No courses allocated yet. Please submit your preferences.
        </div>
      )}
    </div>
  )
}

export default StudentDashboard