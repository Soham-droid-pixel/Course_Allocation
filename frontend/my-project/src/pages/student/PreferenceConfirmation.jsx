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
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          No preference data found. Please submit your preferences first.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Review Your Preferences</h2>
        
        <div className="space-y-6">
          {selectedCourses.map(({ category, choices }) => (
            <div key={category} className="border-b pb-4">
              <h3 className="font-semibold text-lg mb-2">{category}</h3>
              <div className="space-y-2">
                {choices.choice1 && (
                  <div className="flex items-center">
                    <span className="font-medium mr-2">1st Choice:</span>
                    <span>{getCourseDetails(choices.choice1).name}</span>
                  </div>
                )}
                {choices.choice2 && (
                  <div className="flex items-center">
                    <span className="font-medium mr-2">2nd Choice:</span>
                    <span>{getCourseDetails(choices.choice2).name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <label className="block text-gray-700 mb-2">
            Comments (optional):
          </label>
          <textarea
            className="w-full p-3 border rounded-lg"
            rows="4"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add any comments about your selections..."
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={() => handleConfirm(false)}
            disabled={isSubmitting}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            Return to Edit
          </button>
          <button
            onClick={() => handleConfirm(true)}
            disabled={isSubmitting}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Confirm Selections
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreferenceConfirmation;