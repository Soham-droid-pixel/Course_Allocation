import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { confirmPreferences } from '../../services/api';

function PreferenceConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState([]);

  const { preferences, studentId, coursesData } = location.state || {};

  useEffect(() => {
    if (preferences?.preferences) {
      // Extract only selected courses
      const selected = Object.entries(preferences.preferences)
        .filter(([_, choices]) => choices.choice1 || choices.choice2)
        .map(([category, choices]) => ({
          category,
          choices: {
            choice1: choices.choice1 || "",
            choice2: choices.choice2 || ""
          }
        }));
      setSelectedCourses(selected);
    }
  }, [preferences]);

  const getCourseDetails = (courseId) => {
    if (!coursesData) return { name: courseId, credits: 'N/A' };

    for (const courses of Object.values(coursesData)) {
      const course = courses.find(c => c.id === courseId);
      if (course) return course;
    }
    return { name: courseId, credits: 'N/A' };
  };

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

  const handleConfirm = async (confirm) => {
    try {
      setIsSubmitting(true);

      // Ensure all categories have valid choices with empty strings as defaults
      const formattedPreferences = {};
      for (const category of [
        'PECL1', 'PECL2', 'Program Elective', 'Open Elective',
        'Honors', 'Minor', 'MDM'
      ]) {
        const current = preferences.preferences[category] || {};
        formattedPreferences[category] = {
          choice1: current.choice1 || "",
          choice2: current.choice2 || ""
        };
      }

      const confirmationData = {
        student_id: studentId,
        name: preferences.name || "Unknown",
        preferences: formattedPreferences,
        confirm: Boolean(confirm),
        comments: comments || "",
        status: confirm ? "confirmed" : "draft",
        updated_at: new Date().toISOString()
      };

      console.log('Sending confirmation data:', confirmationData);
      await confirmPreferences(studentId, confirmationData);
      
      toast.success(confirm ? 
        'Preferences confirmed successfully!' : 
        'Preferences saved as draft'
      );

      navigate(confirm ? '/student/dashboard' : '/student/preferences');
    } catch (error) {
      console.error('Confirmation error:', error);
      toast.error('Failed to process confirmation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!preferences || !studentId) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 sm:p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">No Preference Data Found</h2>
              <p className="text-gray-600 mb-6">Please submit your preferences first to continue.</p>
              <button
                onClick={() => navigate('/student/preferences')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Go to Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 via-blue-600 to-indigo-600 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                ✅ Review & Confirm
              </h1>
              <p className="text-blue-100 text-sm sm:text-base lg:text-lg">
                Review your course preferences before final submission
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <div className="text-center sm:text-right">
                <div className="text-2xl sm:text-3xl font-bold">{selectedCourses.length}</div>
                <div className="text-xs sm:text-sm text-blue-100">Categories</div>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                {studentId}
              </div>
            </div>
          </div>
        </div>

        {/* Preference Review Cards */}
        <div className="space-y-4">
          {selectedCourses.map(({ category, choices }) => (
            <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">{getCategoryIcon(category)}</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{category}</h3>
                  <p className="text-sm text-gray-600">Your course selections</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {choices.choice1 && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">
                          {getCourseDetails(choices.choice1).name}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {choices.choice1} • {getCourseDetails(choices.choice1).credits} credits
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold self-start sm:self-center">
                      First Choice
                    </span>
                  </div>
                )}
                
                {choices.choice2 && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">
                          {getCourseDetails(choices.choice2).name}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {choices.choice2} • {getCourseDetails(choices.choice2).credits} credits
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold self-start sm:self-center">
                      Second Choice
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            💬 Additional Comments
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments (optional):
            </label>
            <textarea
              className="w-full p-3 sm:p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              rows="4"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments about your selections, special requirements, or questions..."
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-2">
              Your comments will be reviewed by the academic committee during course allocation.
            </p>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 sm:p-6">
          <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Important Information
          </h4>
          <div className="space-y-2 text-sm text-yellow-800">
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 mt-0.5">•</span>
              <span>Once confirmed, your preferences cannot be modified</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 mt-0.5">•</span>
              <span>Course allocation is based on availability and academic requirements</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 mt-0.5">•</span>
              <span>First choices have higher priority during allocation</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 mt-0.5">•</span>
              <span>Results will be available after the allocation process completes</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              onClick={() => handleConfirm(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 disabled:opacity-50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Return to Edit
            </button>
            <button
              onClick={() => handleConfirm(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 disabled:opacity-50 transition-all transform hover:scale-105"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Confirming...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm Selections
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreferenceConfirmation;