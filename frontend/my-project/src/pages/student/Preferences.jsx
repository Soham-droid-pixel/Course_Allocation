import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import CourseCard from '../../components/student/CourseCard';
import { submitPreferences } from '../../services/api';

const CourseCategory = {
  PECL1: 'PECL1',
  PECL2: 'PECL2',
  PROGRAM_ELECTIVE: 'Program Elective',
  OPEN_ELECTIVE: 'Open Elective',
  HONORS: 'Honors',
  MINOR: 'Minor',
  MDM: 'MDM'
};

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
    { id: 'MDM1', name: 'Emotional and Spiritual Intelligence', credits: 1 },
    { id: 'MDM2', name: 'Health,Wellness and Pyschology', credits: 1 }
  ]
}

function Preferences() {
  const navigate = useNavigate();
  const location = useLocation();
  const existingPreferences = location.state?.existingPreferences;

  // Initialize state with existing preferences if available
  const [preferences, setPreferences] = useState(
    existingPreferences?.preferences || 
    Object.values(CourseCategory).reduce((acc, cat) => ({
      ...acc,
      [cat]: []
    }), {})
  );

  const validatePreferences = () => {
    const errors = [];

    // MDM mandatory, exactly 1 choice
    if ((preferences[CourseCategory.MDM]?.length || 0) !== 1) {
      errors.push('Exactly one MDM course selection is mandatory');
    }

    // Required categories: max 2 choices each, at least one choice
    const requiredCategories = [
      CourseCategory.PECL1,
      CourseCategory.PECL2,
      CourseCategory.PROGRAM_ELECTIVE,
      CourseCategory.OPEN_ELECTIVE,
    ];

    requiredCategories.forEach(category => {
      if (!preferences[category]?.length) {
        errors.push(`At least one choice required for ${category}`);
      } else if (preferences[category].length > 2) {
        errors.push(`Maximum 2 choices allowed for ${category}`);
      }
    });

    // Honors and Minor: max 1 choice total combined, or zero
    const honorsCount = preferences[CourseCategory.HONORS]?.length || 0;
    const minorCount = preferences[CourseCategory.MINOR]?.length || 0;
    if (honorsCount + minorCount > 1) {
      errors.push('You can select only one course between Honors and Minor');
    }

    // Max 1 choice per MDM enforced above, but also check
    if ((preferences[CourseCategory.MDM]?.length || 0) > 1) {
      errors.push('Only one MDM choice allowed');
    }

    return errors;
  };

  const handleSubmit = async () => {
    try {
      const errors = validatePreferences();
      if (errors.length > 0) {
        errors.forEach(error => toast.error(error));
        return;
      }

      // Format preferences to match API expectations
      const formattedPreferences = {
        student_id: localStorage.getItem('userId') || 'TEST001',
        name: localStorage.getItem('userName') || 'Test Student',
        preferences: Object.entries(preferences).reduce((acc, [category, courses]) => {
          // Convert array of courses to CourseChoice format
          return {
            ...acc,
            [category]: {
              choice1: courses[0]?.id || "",  // Use empty string instead of null
              choice2: courses[1]?.id || ""   // Use empty string instead of null
            }
          };
        }, {}),
        status: "draft"  // Initial status
      };

      // Ensure MDM is present
      if (!formattedPreferences.preferences[CourseCategory.MDM]?.choice1) {
        toast.error('MDM first choice is mandatory');
        return;
      }

      await submitPreferences(formattedPreferences);
      toast.success('Preferences submitted successfully!');
      
      navigate('/student/preferences/confirm', {
        state: {
          preferences: formattedPreferences,
          studentId: formattedPreferences.student_id,
          coursesData: COURSES  // Pass course details for display
        }
      });
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit preferences');
    }
  };

  const handleSelect = (courseType, course) => {
    setPreferences(prev => {
      const currentPrefs = [...(prev[courseType] || [])];
      const index = currentPrefs.findIndex(c => c.id === course.id);

      if (index === -1) {
        // Adding a new choice

        if (
          [CourseCategory.PECL1, CourseCategory.PECL2, CourseCategory.PROGRAM_ELECTIVE, CourseCategory.OPEN_ELECTIVE].includes(courseType)
        ) {
          if (currentPrefs.length >= 2) {
            toast.error(`Maximum 2 choices allowed for ${courseType}`);
            return prev;
          }
        } else if (
          [CourseCategory.HONORS, CourseCategory.MINOR].includes(courseType)
        ) {
          const honorsCount = prev[CourseCategory.HONORS]?.length || 0;
          const minorCount = prev[CourseCategory.MINOR]?.length || 0;
          if (honorsCount + minorCount >= 1) {
            toast.error('You can select only one course between Honors and Minor');
            return prev;
          }
        } else if (courseType === CourseCategory.MDM) {
          if (currentPrefs.length >= 1) {
            toast.error('Only one MDM choice allowed');
            return prev;
          }
        }

        currentPrefs.push(course);
      } else {
        // Removing selected course
        currentPrefs.splice(index, 1);
      }

      return { ...prev, [courseType]: currentPrefs };
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Course Preferences</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setPreferences(Object.values(CourseCategory).reduce((acc, cat) => ({
              ...acc,
              [cat]: []
            }), {}))}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
          >
            Reset
          </button>
          <button
            onClick={handleSubmit}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Review & Submit
          </button>
        </div>
      </div>

      {Object.entries(COURSES).map(([type, courses]) => (
        <div key={type} className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold flex justify-between">
            {type}
            {type === CourseCategory.MDM && (
              <span className="text-red-500 text-sm">*Required</span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                selected={preferences[type]?.some(p => p.id === course.id)}
                preference={preferences[type]?.findIndex(p => p.id === course.id) + 1}
                onSelect={() => handleSelect(type, course)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Preferences;
