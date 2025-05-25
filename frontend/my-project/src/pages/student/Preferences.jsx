import { useState } from 'react'
import { toast } from 'react-hot-toast'
import CourseCard from '../../components/student/CourseCard'
import { submitPreferences } from '../../services/api'

const CourseCategory = {
  PECL1: 'PECL1',
  PECL2: 'PECL2',
  PROGRAM_ELECTIVE: 'PROGRAM_ELECTIVE',
  OPEN_ELECTIVE: 'OPEN_ELECTIVE',
  HONORS: 'HONORS',
  MINOR: 'MINOR',
  MDM: 'MDM'
}

const COURSES = {
  [CourseCategory.PECL1]: [
    { id: '25PECL13CE11', name: 'Image processing Lab', credits: 1 },
    { id: '25PECL13CE12', name: 'Natural Language Processing Lab', credits: 1 },
    { id: '25PECL13CE13', name: 'IIOT lab', credits: 1 },
    { id: '25PECL13CE14', name: 'Innovative Product Development Lab-Phase1', credits: 1 },
    { id: '25PECL13CE15', name: 'Open-Source Intelligence and Threat Intelligence lab', credits: 1 }
  ],
  [CourseCategory.PECL2]: [
    { id: '25PECL13CE21', name: 'Social Media Analytics Lab', credits: 1 },
    { id: '25PECL13CE22', name: 'Ethical Hacking Lab', credits: 1 },
    { id: '25PECL13CE23', name: 'DevOps Lab', credits: 1 },
    { id: '25PECL13CE24', name: 'Innovative Product Development Lab-Phase2', credits: 1 },
    { id: '25PECL13CE25', name: 'Explainable AI Lab', credits: 1 },
    { id: '25PECL13CE26', name: 'Software Testing and Quality assurance lab', credits: 1 }
  ],
  [CourseCategory.PROGRAM_ELECTIVE]: [
    { id: '25PEC13CE11', name: 'Block chain Technology', credits: 3 },
    { id: '25PEC13CE12', name: 'Deep Learning and Reinforcement Learning', credits: 3 },
    { id: '25PEC13CE13', name: 'Cyber Security', credits: 3 },
    { id: '25PEC13CE14', name: 'Big data analytics', credits: 3 },
    { id: '25PEC13CE15', name: 'Computer Graphics', credits: 3 },
    { id: '25PEC13CE16', name: 'HMI', credits: 3 },
    { id: '25PEC13CE17', name: 'Geographical Information Systems', credits: 3 }
  ],
  [CourseCategory.OPEN_ELECTIVE]: [
    { id: 'OE1', name: 'Advanced Microprocessor', credits: 3 },
    { id: 'OE2', name: 'Internet of Things', credits: 3 },
    { id: 'OE3', name: 'E-Vehicle', credits: 3 },
    { id: 'OE4', name: 'Supply Chain Management', credits: 3 },
    { id: 'OE5', name: 'Design of Experiments', credits: 3 },
    { id: 'OE6', name: '3D Printing', credits: 3 }
  ],
  [CourseCategory.HONORS]: [
    { id: 'H1', name: 'Internet of Things', credits: 3 },
    { id: 'H2', name: 'Artificial Intelligence and Machine Learning', credits: 3 },
    { id: 'H3', name: 'Data Science', credits: 3 },
    { id: 'H4', name: 'Blockchain', credits: 3 },
    { id: 'H5', name: 'Cybersecurity', credits: 3 }
  ],
  [CourseCategory.MINOR]: [
    { id: 'M1', name: 'Robotics', credits: 3 },
    { id: 'M2', name: '3D Printing', credits: 3 }
  ],
  [CourseCategory.MDM]: [
    { id: 'MDM1', name: 'Emotiinal and Spiritual Intelligence', credits: 1 },
    { id: 'MDM2', name: 'Health,Wellness and Pyschology', credits: 1 }
    
  ]
}

function Preferences() {
  const [preferences, setPreferences] = useState(
    Object.keys(CourseCategory).reduce((acc, cat) => ({ ...acc, [cat]: [] }), {})
  )

  const handleSelect = (courseType, course) => {
    setPreferences(prev => {
      const currentPrefs = [...prev[courseType]]
      const index = currentPrefs.findIndex(c => c.id === course.id)
      
      // Maximum 2 choices per category
      if (index === -1) {
        if (currentPrefs.length < 2) {
          currentPrefs.push(course)
        } else {
          toast.error(`Maximum 2 choices allowed for ${courseType}`)
          return prev
        }
      } else {
        currentPrefs.splice(index, 1)
      }

      return { ...prev, [courseType]: currentPrefs }
    })
  }

  const handleSubmit = async () => {
    try {
      // Validate MDM selection is mandatory
      if (preferences[CourseCategory.MDM].length === 0) {
        throw new Error('MDM course selection is mandatory')
      }

      // Format preferences for API
      const formattedPreferences = Object.entries(preferences).reduce((acc, [category, selected]) => ({
        ...acc,
        [category]: {
          choice1: selected[0]?.id || null,
          choice2: selected[1]?.id || null
        }
      }), {})

      await submitPreferences({
        student_id: localStorage.getItem('studentId'),
        name: localStorage.getItem('studentName'),
        preferences: formattedPreferences
      })

      toast.success('Preferences submitted successfully!')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Course Preferences</h2>
        <button
          onClick={handleSubmit}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500"
        >
          Submit Preferences
        </button>
      </div>

      {Object.entries(COURSES).map(([type, courses]) => (
        <div key={type} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <h3 className="text-xl font-semibold flex justify-between">
            {type.replace('_', ' ')}
            {type === CourseCategory.MDM && (
              <span className="text-red-500 text-sm">*Required</span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                selected={preferences[type].some(p => p.id === course.id)}
                preference={preferences[type].findIndex(p => p.id === course.id) + 1}
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