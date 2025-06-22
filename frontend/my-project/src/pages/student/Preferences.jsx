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

  const [currentStep, setCurrentStep] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const categorySteps = Object.entries(COURSES);

  const getCategoryIcon = (category) => {
    const icons = {
      'PECL1': '⚡',
      'PECL2': '🔬',
      'Program Elective': '📚',
      'Open Elective': '🌟',
      'Honors': '🏆',
      'Minor': '🎯',
      'MDM': '🧠'
    };
    return icons[category] || '📖';
  };

  const getCategoryDescription = (category) => {
    const descriptions = {
      'PECL1': 'Choose your first specialized lab',
      'PECL2': 'Choose your second specialized lab',
      'Program Elective': 'Core program courses',
      'Open Elective': 'Interdisciplinary courses',
      'Honors': 'Advanced honors program',
      'Minor': 'Minor specialization',
      'MDM': 'Mandatory development modules'
    };
    return descriptions[category] || 'Select your courses';
  };

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
              choice1: courses[0]?.id || "",
              choice2: courses[1]?.id || ""
            }
          };
        }, {}),
        status: "draft"
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
          coursesData: COURSES
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

  const getTotalSelections = () => {
    return Object.values(preferences).reduce((total, courses) => total + courses.length, 0);
  };

  const getProgressPercentage = () => {
    const totalCategories = Object.keys(COURSES).length;
    const completedCategories = Object.entries(preferences).filter(([_, courses]) => courses.length > 0).length;
    return Math.round((completedCategories / totalCategories) * 100);
  };

  if (showSummary) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  📝 Preference Summary
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Review your selections before submitting
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <button
                  onClick={() => setShowSummary(false)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  ← Edit Selections
                </button>
                <div className="text-center sm:text-right">
                  <div className="text-2xl font-bold text-green-600">{getTotalSelections()}</div>
                  <div className="text-xs text-gray-500">Total Selections</div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="space-y-4 sm:space-y-6">
            {Object.entries(preferences)
              .filter(([_, courses]) => courses.length > 0)
              .map(([category, courses]) => (
                <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{getCategoryIcon(category)}</span>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">{category}</h3>
                      <p className="text-sm text-gray-600">{courses.length} course{courses.length > 1 ? 's' : ''} selected</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {courses.map((course, index) => (
                      <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{course.name}</p>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {course.id} • {course.credits} credits
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-medium">
                          Choice {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
            <button
              onClick={() => setPreferences(Object.values(CourseCategory).reduce((acc, cat) => ({
                ...acc,
                [cat]: []
              }), {}))}
              className="w-full sm:w-auto px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
            >
              🔄 Reset All
            </button>
            <button
              onClick={handleSubmit}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105"
            >
              ✅ Submit Preferences
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white rounded-2xl p-6 sm:p-8 mb-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                📚 Course Preferences
              </h1>
              <p className="text-blue-100 text-sm sm:text-base lg:text-lg">
                Select your preferred courses for the upcoming semester
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start lg:items-end">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold">{getProgressPercentage()}%</div>
                <div className="text-xs sm:text-sm text-blue-100">Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold">{getTotalSelections()}</div>
                <div className="text-xs sm:text-sm text-blue-100">Selections</div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="bg-white/20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Mobile */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setShowSummary(true)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium"
            >
              <span>📋</span>
              Summary ({getTotalSelections()})
            </button>
            <button
              onClick={() => setPreferences(Object.values(CourseCategory).reduce((acc, cat) => ({
                ...acc,
                [cat]: []
              }), {}))}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium"
            >
              <span>🔄</span>
              Reset
            </button>
          </div>
        </div>

        {/* Desktop Action Bar */}
        <div className="hidden lg:flex justify-between items-center mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-3">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{Object.keys(COURSES).length}</div>
                <div className="text-xs text-gray-500">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{getTotalSelections()}</div>
                <div className="text-xs text-gray-500">Selected</div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => setShowSummary(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              <span>📋</span>
              View Summary
            </button>
            <button
              onClick={() => setPreferences(Object.values(CourseCategory).reduce((acc, cat) => ({
                ...acc,
                [cat]: []
              }), {}))}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
            >
              <span>🔄</span>
              Reset All
            </button>
          </div>
        </div>

        {/* Course Categories */}
        <div className="space-y-6">
          {Object.entries(COURSES).map(([type, courses]) => (
            <div key={type} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-xl">{getCategoryIcon(type)}</span>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                      {type}
                      {type === CourseCategory.MDM && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">
                          Required
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">{getCategoryDescription(type)}</p>
                  </div>
                </div>
                
                {/* Selection Counter */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {preferences[type]?.length || 0} selected
                  </span>
                  {type !== CourseCategory.MDM && type !== CourseCategory.HONORS && type !== CourseCategory.MINOR && (
                    <span className="text-xs text-gray-500">Max: 2</span>
                  )}
                </div>
              </div>

              {/* Course Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

              {/* Category Rules */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  {type === CourseCategory.MDM && "⚠️ Exactly 1 course must be selected"}
                  {[CourseCategory.PECL1, CourseCategory.PECL2, CourseCategory.PROGRAM_ELECTIVE, CourseCategory.OPEN_ELECTIVE].includes(type) && 
                    "💡 Select 1-2 courses (first choice is mandatory)"
                  }
                  {[CourseCategory.HONORS, CourseCategory.MINOR].includes(type) && 
                    "🎯 Select max 1 course total between Honors and Minor"
                  }
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Action Bar - Mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="flex gap-3">
            <button
              onClick={() => setShowSummary(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-semibold"
            >
              <span>📋</span>
              Summary ({getTotalSelections()})
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-semibold"
            >
              <span>✅</span>
              Submit
            </button>
          </div>
        </div>

        {/* Padding for mobile bottom bar */}
        <div className="h-20 lg:hidden"></div>
      </div>
    </div>
  );
}

export default Preferences;
