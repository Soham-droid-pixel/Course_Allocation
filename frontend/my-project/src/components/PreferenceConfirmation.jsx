import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { confirmPreferences, confirmPreferencesFinal, saveDraft, getMyPreferences, setConfirmedStatus } from "../../services/api";

function PreferenceConfirmation() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.roll_number) {
      loadPreferences();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      // First priority: Check if preferences were passed from the form
      const navigationState = location.state;
      
      if (navigationState?.fromForm && navigationState?.preferences) {
        console.log('Using preferences from form navigation:', navigationState.preferences);
        
        const preferencesData = {
          roll_number: user.roll_number,
          name: user.email.split('@')[0],
          preferences: navigationState.preferences,
          status: 'draft'
        };
        
        setPreferences(preferencesData);
        extractSelectedCourses(navigationState.preferences);
        
      } else {
        // Fallback: Load from API
        console.log('Loading preferences from API...');
        const data = await getMyPreferences();
        console.log('API response:', data);
        
        if (data && data.preferences) {
          setPreferences(data);
          extractSelectedCourses(data.preferences);
        } else {
          toast.error('No preferences found. Please submit your preferences first.');
          navigate("/student/preferences");
          return;
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      toast.error("Failed to load preferences");
      navigate("/student/preferences");
    } finally {
      setLoading(false);
    }
  };

  const extractSelectedCourses = (preferencesData) => {
    console.log('Extracting courses from:', preferencesData);
    
    const selected = [];
    
    // Process each category
    Object.entries(preferencesData).forEach(([category, choices]) => {
      if (choices && (
        (choices.choice1 && choices.choice1.trim()) || 
        (choices.choice2 && choices.choice2.trim())
      )) {
        selected.push({
          category,
          choices: {
            choice1: choices.choice1 || "",
            choice2: choices.choice2 || "",
          },
        });
      }
    });
    
    console.log('Extracted selected courses:', selected);
    setSelectedCourses(selected);
    
    // Validate that we have selections
    if (selected.length === 0) {
      toast.error('No course preferences found. Please submit your preferences first.');
      navigate('/student/preferences');
      return;
    }
    
    // Check for mandatory courses
    const mandatoryCategories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM'];
    const missingMandatory = mandatoryCategories.filter(cat => 
      !selected.find(sel => sel.category === cat && sel.choices.choice1)
    );
    
    if (missingMandatory.length > 0) {
      toast.warning(`Missing mandatory selections: ${missingMandatory.join(', ')}`);
    }
  };

  const getCourseDetails = (courseId) => {
    const courseNames = {
      // PECL1 courses
      "25PECL13CE11": { name: "Image Processing Lab", credits: 1 },
      "25PECL13CE12": { name: "Natural Language Processing Lab", credits: 1 },
      "25PECL13CE13": { name: "IIOT Lab", credits: 1 },
      "25PECL13CE14": { name: "Innovative Product Development Lab-Phase1", credits: 1 },
      "25PECL13CE15": { name: "Open-Source Intelligence Lab", credits: 1 },

      // PECL2 courses
      "25PECL13CE21": { name: "Social Media Analytics Lab", credits: 1 },
      "25PECL13CE22": { name: "Ethical Hacking Lab", credits: 1 },
      "25PECL13CE23": { name: "DevOps Lab", credits: 1 },
      "25PECL13CE24": { name: "Innovative Product Development Lab-Phase2", credits: 1 },
      "25PECL13CE25": { name: "Explainable AI Lab", credits: 1 },
      "25PECL13CE26": { name: "Software Testing Lab", credits: 1 },

      // Program Electives
      "25PEC13CE11": { name: "Blockchain Technology", credits: 3 },
      "25PEC13CE12": { name: "Deep Learning and Reinforcement Learning", credits: 3 },
      "25PEC13CE13": { name: "Cyber Security", credits: 3 },
      "25PEC13CE14": { name: "Big Data Analytics", credits: 3 },
      "25PEC13CE15": { name: "Computer Graphics", credits: 3 },
      "25PEC13CE16": { name: "HMI", credits: 3 },
      "25PEC13CE17": { name: "Geographical Information Systems", credits: 3 },

      // Open Electives
      "OE1": { name: "Advanced Microprocessor", credits: 3 },
      "OE2": { name: "Internet of Things", credits: 3 },
      "OE3": { name: "E-Vehicle", credits: 3 },
      "OE4": { name: "Supply Chain Management", credits: 3 },
      "OE5": { name: "Design of Experiments", credits: 3 },
      "OE6": { name: "3D Printing", credits: 3 },

      // Honors
      "H1": { name: "IoT Honors", credits: 4 },
      "H2": { name: "AI/ML Honors", credits: 4 },
      "H3": { name: "Data Science Honors", credits: 4 },
      "H4": { name: "Blockchain Honors", credits: 4 },
      "H5": { name: "Cybersecurity Honors", credits: 4 },

      // Minor
      "M1": { name: "Robotics Minor", credits: 4 },
      "M2": { name: "3D Printing Minor", credits: 4 },

      // MDM
      "MDM1": { name: "Emotional and Spiritual Intelligence", credits: 1 },
      "MDM2": { name: "Health, Wellness and Psychology", credits: 1 },
    };

    return courseNames[courseId] || { name: courseId, credits: "N/A" };
  };

  const handleConfirm = async (confirmAction) => {
    if (!user?.roll_number) {
      toast.error("Please log in");
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (confirmAction) {
        // Use the dedicated confirmation endpoint
        console.log("=== CALLING DEDICATED CONFIRM ENDPOINT ===");
        const result = await setConfirmedStatus();
        console.log("Confirmation result:", result);
        
        toast.success("Preferences confirmed successfully!");
        navigate("/student/dashboard");
      } else {
        // Return to edit
        toast.success("Returning to edit mode");
        navigate("/student/preferences");
      }

    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to confirm preferences");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmFinal = async () => {
    console.log("=== CONFIRM FINAL CALLED ===");
    await handleConfirm(true);  // Explicitly pass true
  };

  const handleReturnToDraft = async () => {
    console.log("=== RETURN TO DRAFT CALLED ===");
    await handleConfirm(false);  // Explicitly pass false
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">Please log in to access this page.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading preferences...</span>
        </div>
      </div>
    );
  }

  if (!preferences || selectedCourses.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">No Preferences Found</h3>
          <p className="text-yellow-700 mb-4">
            No course preferences found. Please submit your preferences first.
          </p>
          <button
            onClick={() => navigate('/student/preferences')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Preferences
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Review Your Preferences</h2>

        <div className="mb-6">
          <p className="text-gray-600">
            Student: <strong>{user.roll_number}</strong>
          </p>
          <p className="text-gray-600">
            Status:{" "}
            <strong className={`${preferences.status === "confirmed" ? "text-green-600" : "text-yellow-600"}`}>
              {preferences.status.charAt(0).toUpperCase() + preferences.status.slice(1)}
            </strong>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Found {selectedCourses.length} course categories with selections
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {selectedCourses.map(({ category, choices }) => (
            <div key={category} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2 text-blue-800">{category}</h3>
              <div className="space-y-1">
                {choices.choice1 && choices.choice1.trim() && (
                  <div className="flex items-center">
                    <span className="font-medium text-green-700 mr-2 w-20">1st Choice:</span>
                    <span className="text-gray-800">
                      <strong>{choices.choice1}</strong> - {getCourseDetails(choices.choice1).name} 
                      <span className="text-gray-600"> ({getCourseDetails(choices.choice1).credits} credits)</span>
                    </span>
                  </div>
                )}
                {choices.choice2 && choices.choice2.trim() && (
                  <div className="flex items-center">
                    <span className="font-medium text-blue-700 mr-2 w-20">2nd Choice:</span>
                    <span className="text-gray-800">
                      <strong>{choices.choice2}</strong> - {getCourseDetails(choices.choice2).name}
                      <span className="text-gray-600"> ({getCourseDetails(choices.choice2).credits} credits)</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">Comments (optional):</label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add any comments about your selections..."
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={handleReturnToDraft}  // This sends confirm: false (draft)
            disabled={isSubmitting}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            Return to Edit
          </button>
          <button
            onClick={handleConfirmFinal}   // This should send confirm: true (confirmed)
            disabled={isSubmitting}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Confirm Selections  {/* Make sure you're clicking THIS button */}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreferenceConfirmation;