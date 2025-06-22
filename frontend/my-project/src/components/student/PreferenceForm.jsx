import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { submitPreferences, getMyPreferences } from '../../services/api';

const CourseCategory = {
    PECL1: 'PECL1',
    PECL2: 'PECL2',
    PROGRAM_ELECTIVE: 'Program Elective',
    OPEN_ELECTIVE: 'Open Elective',
    HONORS: 'Honors',
    MINOR: 'Minor',
    MDM: 'MDM'
};

const courses = {
    [CourseCategory.PECL1]: [
        { id: '25PECL13CE11', name: 'Image Processing Lab', credits: 1 },
        { id: '25PECL13CE12', name: 'Natural Language Processing Lab', credits: 1 },
        { id: '25PECL13CE13', name: 'IIOT Lab', credits: 1 },
        { id: '25PECL13CE14', name: 'Innovative Product Development Lab-Phase1', credits: 1 },
        { id: '25PECL13CE15', name: 'Open-Source Intelligence Lab', credits: 1 }
    ],
    [CourseCategory.PECL2]: [
        { id: '25PECL13CE21', name: 'Social Media Analytics Lab', credits: 1 },
        { id: '25PECL13CE22', name: 'Ethical Hacking Lab', credits: 1 },
        { id: '25PECL13CE23', name: 'DevOps Lab', credits: 1 },
        { id: '25PECL13CE24', name: 'Innovative Product Development Lab-Phase2', credits: 1 },
        { id: '25PECL13CE25', name: 'Explainable AI Lab', credits: 1 },
        { id: '25PECL13CE26', name: 'Software Testing Lab', credits: 1 }
    ],
    [CourseCategory.PROGRAM_ELECTIVE]: [
        { id: '25PEC13CE11', name: 'Blockchain Technology', credits: 3 },
        { id: '25PEC13CE12', name: 'Deep Learning and Reinforcement Learning', credits: 3 },
        { id: '25PEC13CE13', name: 'Cyber Security', credits: 3 },
        { id: '25PEC13CE14', name: 'Big Data Analytics', credits: 3 },
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
        { id: 'H1', name: 'IoT Honors', credits: 4 },
        { id: 'H2', name: 'AI/ML Honors', credits: 4 },
        { id: 'H3', name: 'Data Science Honors', credits: 4 },
        { id: 'H4', name: 'Blockchain Honors', credits: 4 },
        { id: 'H5', name: 'Cybersecurity Honors', credits: 4 }
    ],
    [CourseCategory.MINOR]: [
        { id: 'M1', name: 'Robotics Minor', credits: 4 },
        { id: 'M2', name: '3D Printing Minor', credits: 4 }
    ],
    [CourseCategory.MDM]: [
        { id: 'MDM1', name: 'Emotional and Spiritual Intelligence', credits: 1 },
        { id: 'MDM2', name: 'Health, Wellness and Psychology', credits: 1 }
    ]
};

function PreferenceForm() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [preferences, setPreferences] = useState({});
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        if (user && user.roll_number) {
            loadExistingPreferences();
        } else {
            setInitialLoading(false);
        }
    }, [user, location.state]);

    const loadExistingPreferences = async () => {
        try {
            setInitialLoading(true);
            
            // Check if we're editing existing preferences
            if (location.state?.editMode && location.state?.currentPreferences) {
                console.log('Loading preferences for editing:', location.state.currentPreferences);
                
                const formattedPrefs = {};
                Object.entries(location.state.currentPreferences).forEach(([category, choices]) => {
                    if (choices && (choices.choice1 || choices.choice2)) {
                        formattedPrefs[category] = {
                            choice1: choices.choice1 || "",
                            choice2: choices.choice2 || ""
                        };
                    }
                });
                
                setPreferences(formattedPrefs);
                toast.info('Loaded your previous preferences for editing');
            } else {
                // Try to load existing preferences from API
                try {
                    const existingPrefs = await getMyPreferences();
                    if (existingPrefs && existingPrefs.preferences) {
                        console.log('Loaded existing preferences:', existingPrefs.preferences);
                        
                        const formattedPrefs = {};
                        Object.entries(existingPrefs.preferences).forEach(([category, choices]) => {
                            if (choices && (choices.choice1 || choices.choice2)) {
                                formattedPrefs[category] = {
                                    choice1: choices.choice1 || "",
                                    choice2: choices.choice2 || ""
                                };
                            }
                        });
                        
                        setPreferences(formattedPrefs);
                        
                        if (Object.keys(formattedPrefs).length > 0) {
                            toast.info('Loaded your existing preferences');
                        }
                    }
                } catch (error) {
                    console.log('No existing preferences found, starting fresh');
                }
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    const handlePreferenceChange = (category, choiceType, value) => {
        console.log(`Setting ${category} ${choiceType} to:`, value);
        
        setPreferences(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [choiceType]: value
            }
        }));
    };

    const validatePreferences = () => {
        // Check mandatory categories
        const mandatoryCategories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM'];
        const missingMandatory = [];
        
        for (const category of mandatoryCategories) {
            if (!preferences[category]?.choice1) {
                missingMandatory.push(category);
            }
        }
        
        if (missingMandatory.length > 0) {
            throw new Error(`Please select first choice for: ${missingMandatory.join(', ')}`);
        }
        
        // Validate MDM specifically
        if (!preferences.MDM?.choice1) {
            throw new Error('MDM course selection is mandatory');
        }
        
        // Check for same choice in first and second
        for (const [category, choices] of Object.entries(preferences)) {
            if (choices.choice1 && choices.choice2 && choices.choice1 === choices.choice2) {
                throw new Error(`Cannot select the same course for both choices in ${category}`);
            }
        }
        
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!user || !user.roll_number) {
            toast.error('Please log in to submit preferences');
            return;
        }

        console.log('Current preferences state:', preferences);

        try {
            setLoading(true);
            
            // Validate preferences
            validatePreferences();

            // Format preferences for API - ensure all categories are included
            const formattedPreferences = {};
            Object.keys(courses).forEach(category => {
                formattedPreferences[category] = {
                    choice1: preferences[category]?.choice1 || "",
                    choice2: preferences[category]?.choice2 || ""
                };
            });

            console.log('Formatted preferences for submission:', formattedPreferences);

            const submissionData = {
                name: user.email.split('@')[0],
                preferences: formattedPreferences,
                status: "draft",
                comments: ""
            };

            console.log('Final submission data:', submissionData);

            await submitPreferences(submissionData);

            toast.success('Preferences saved successfully! Proceed to confirmation.');
            
            // Navigate to confirmation with the current preferences
            navigate('/student/preferences/confirm', {
                state: {
                    preferences: formattedPreferences,
                    fromForm: true
                }
            });
            
        } catch (error) {
            console.error('Submit error:', error);
            toast.error(error.message || 'Failed to submit preferences');
        } finally {
            setLoading(false);
        }
    };

    // Show login prompt if user is not authenticated
    if (!user) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-yellow-800 mb-2">Authentication Required</h2>
                    <p className="text-yellow-700">Please log in to submit your course preferences.</p>
                </div>
            </div>
        );
    }

    if (initialLoading) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Course Preference Selection</h2>
                <p className="text-gray-600">Welcome, {user.roll_number}! Please select your course preferences.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
                {Object.entries(courses).map(([category, courseList]) => (
                    <div key={category} className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {category.replace('_', ' ')}
                            {['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM'].includes(category) && 
                                <span className="text-red-500"> *</span>}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Choice 
                                    {['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM'].includes(category) && 
                                        <span className="text-red-500">*</span>}
                                </label>
                                <select
                                    value={preferences[category]?.choice1 || ''}
                                    onChange={(e) => {
                                        console.log(`Choice1 changed for ${category}:`, e.target.value);
                                        handlePreferenceChange(category, 'choice1', e.target.value);
                                    }}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    required={['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM'].includes(category)}
                                >
                                    <option value="">Select course</option>
                                    {courseList.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.name} ({course.credits} credits)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Second Choice
                                </label>
                                <select
                                    value={preferences[category]?.choice2 || ''}
                                    onChange={(e) => {
                                        console.log(`Choice2 changed for ${category}:`, e.target.value);
                                        handlePreferenceChange(category, 'choice2', e.target.value);
                                    }}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="">Select course</option>
                                    {courseList
                                        .filter(course => course.id !== preferences[category]?.choice1)
                                        .map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.name} ({course.credits} credits)
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>

                        {/* Show current selections for debugging */}
                        {(preferences[category]?.choice1 || preferences[category]?.choice2) && (
                            <div className="mt-2 text-sm text-blue-600">
                                Current: {preferences[category]?.choice1 || 'None'} | {preferences[category]?.choice2 || 'None'}
                            </div>
                        )}
                    </div>
                ))}

                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Important Notes:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• All categories marked with * are mandatory</li>
                        <li>• MDM course selection is required</li>
                        <li>• You can choose either Honors OR Minor courses (not both)</li>
                        <li>• Second choices will be considered if first choice is not available</li>
                        <li>• This saves as draft - you'll need to confirm on the next page</li>
                    </ul>
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save & Continue to Confirmation'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default PreferenceForm;