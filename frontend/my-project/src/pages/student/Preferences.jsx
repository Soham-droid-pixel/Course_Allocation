import { useState } from 'react'
import { toast } from 'react-hot-toast'
import CourseCard from '../../components/student/CourseCard'
import { COURSES } from '../../utils/constants'
import { submitPreferences } from '../../services/api'

function Preferences() {
  const [preferences, setPreferences] = useState({
    PECL1: [],
    PECL2: [],
    OPEN: []
  })

  const handleSelect = (courseType, course) => {
    setPreferences(prev => {
      const currentPrefs = [...prev[courseType]]
      const index = currentPrefs.findIndex(c => c.id === course.id)
      
      if (index === -1) {
        if (currentPrefs.length < 3) {
          currentPrefs.push(course)
        }
      } else {
        currentPrefs.splice(index, 1)
      }

      return { ...prev, [courseType]: currentPrefs }
    })
  }

  const handleSubmit = async () => {
    try {
      await submitPreferences(preferences)
      toast.success('Preferences submitted successfully!')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Course Preferences</h2>
        <button
          onClick={handleSubmit}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-secondary"
        >
          Submit Preferences
        </button>
      </div>

      {Object.entries(COURSES).map(([type, courses]) => (
        <div key={type} className="space-y-4">
          <h3 className="text-xl font-semibold">{type}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                selected={preferences[type].some(p => p.id === course.id)}
                preference={
                  preferences[type].findIndex(p => p.id === course.id) + 1 || null
                }
                onSelect={() => handleSelect(type, course)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Preferences