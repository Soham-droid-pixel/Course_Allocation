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
    const [currentStep, setCurrentStep] = useState(0);
    const [showMobileStep, setShowMobileStep] = useState(false);

    const categorySteps = Object.keys(courses);

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
        
        if (!preferences.MDM?.choice1) {
            throw new Error('MDM course selection is mandatory');
        }
        
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
            
            validatePreferences();

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

    const getCompletedCount = () => {
        return Object.entries(preferences).filter(([_, choices]) => choices.choice1).length;
    };

    const getProgressPercentage = () => {
        const mandatoryCategories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM'];
        const completed = mandatoryCategories.filter(cat => preferences[cat]?.choice1).length;
        return Math.round((completed / mandatoryCategories.length) * 100);
    };

    const getCurrentStepData = () => {
        const category = categorySteps[currentStep];
        return { category, courseList: courses[category] };
    };

    const nextStep = () => {
        if (currentStep < categorySteps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Show login prompt if user is not authenticated
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6 sm:p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
                            <p className="text-gray-600 mb-6">Please log in to submit your course preferences.</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                            >
                                Go to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (initialLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                    <p className="text-base sm:text-lg text-gray-600">Loading your preferences...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                                📝 Course Preference Form
                            </h1>
                            <p className="text-blue-100 text-sm sm:text-base lg:text-lg mb-3">
                                Welcome, {user.roll_number}! Select your preferred courses for the semester.
                            </p>
                            
                            {/* Mobile View Toggle */}
                            <div className="lg:hidden">
                                <button
                                    onClick={() => setShowMobileStep(!showMobileStep)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                                >
                                    {showMobileStep ? '📋 Show All Categories' : '📱 Step-by-Step Mode'}
                                    <svg className={`w-4 h-4 transform transition-transform ${showMobileStep ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* Progress Stats */}
                        <div className="flex flex-row lg:flex-col gap-4 lg:gap-2 items-center lg:items-end">
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl font-bold">{getProgressPercentage()}%</div>
                                <div className="text-xs sm:text-sm text-blue-100">Complete</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl font-bold">{getCompletedCount()}/7</div>
                                <div className="text-xs sm:text-sm text-blue-100">Categories</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="bg-white/20 rounded-full h-2">
                            <div 
                                className="bg-white rounded-full h-2 transition-all duration-500"
                                style={{ width: `${getProgressPercentage()}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Mobile Step Indicator */}
                    {showMobileStep && (
                        <div className="mt-4 lg:hidden">
                            <div className="flex items-center justify-between text-sm">
                                <span>Step {currentStep + 1} of {categorySteps.length}</span>
                                <span>{getCategoryIcon(categorySteps[currentStep])} {categorySteps[currentStep]}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile Step Navigation */}
                {showMobileStep && (
                    <div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={prevStep}
                                disabled={currentStep === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Previous
                            </button>
                            <div className="text-center">
                                <div className="text-lg font-bold text-gray-900">{categorySteps[currentStep]}</div>
                                <div className="text-xs text-gray-500">Category {currentStep + 1} of {categorySteps.length}</div>
                            </div>
                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={currentStep === categorySteps.length - 1}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Next
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Desktop: Show all categories, Mobile: Show single step if enabled */}
                    {showMobileStep ? (
                        // Mobile Step View
                        <div className="lg:hidden">
                            {(() => {
                                const { category, courseList } = getCurrentStepData();
                                const mandatoryCategories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM'];
                                const isMandatory = mandatoryCategories.includes(category);
                                
                                return (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        {/* Category Header */}
                                        <div className={`p-4 sm:p-6 ${isMandatory ? 'bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100' : 'bg-gray-50 border-b border-gray-200'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                    <span className="text-2xl">{getCategoryIcon(category)}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                                                        {category.replace('_', ' ')}
                                                        {isMandatory && <span className="text-red-500 ml-1">*</span>}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {isMandatory ? 'Required category' : 'Optional category'} • {courseList.length} courses available
                                                    </p>
                                                </div>
                                                {preferences[category]?.choice1 && (
                                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Course Selection */}
                                        <div className="p-4 sm:p-6 space-y-6">
                                            {/* First Choice */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                    🥇 First Choice 
                                                    {isMandatory && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                                <select
                                                    value={preferences[category]?.choice1 || ''}
                                                    onChange={(e) => handlePreferenceChange(category, 'choice1', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm sm:text-base"
                                                    required={isMandatory}
                                                >
                                                    <option value="">Select your preferred course</option>
                                                    {courseList.map(course => (
                                                        <option key={course.id} value={course.id}>
                                                            {course.name} ({course.credits} credit{course.credits > 1 ? 's' : ''})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Second Choice */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                    🥈 Second Choice (Backup)
                                                </label>
                                                <select
                                                    value={preferences[category]?.choice2 || ''}
                                                    onChange={(e) => handlePreferenceChange(category, 'choice2', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm sm:text-base"
                                                >
                                                    <option value="">Select backup course (optional)</option>
                                                    {courseList
                                                        .filter(course => course.id !== preferences[category]?.choice1)
                                                        .map(course => (
                                                            <option key={course.id} value={course.id}>
                                                                {course.name} ({course.credits} credit{course.credits > 1 ? 's' : ''})
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>

                                            {/* Current Selection Summary */}
                                            {(preferences[category]?.choice1 || preferences[category]?.choice2) && (
                                                <div className="bg-blue-50 rounded-lg p-4">
                                                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Your Selections:</h4>
                                                    <div className="space-y-2 text-sm">
                                                        {preferences[category]?.choice1 && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-green-600">🥇</span>
                                                                <span className="text-blue-800">
                                                                    {courseList.find(c => c.id === preferences[category].choice1)?.name}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {preferences[category]?.choice2 && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-blue-600">🥈</span>
                                                                <span className="text-blue-800">
                                                                    {courseList.find(c => c.id === preferences[category].choice2)?.name}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : null}

                    {/* Desktop & Mobile All Categories View */}
                    <div className={showMobileStep ? 'hidden lg:block' : 'block'}>
                        <div className="grid gap-6">
                            {Object.entries(courses).map(([category, courseList]) => {
                                const mandatoryCategories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM'];
                                const isMandatory = mandatoryCategories.includes(category);
                                
                                return (
                                    <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        {/* Category Header */}
                                        <div className={`p-4 sm:p-6 ${isMandatory ? 'bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100' : 'bg-gray-50 border-b border-gray-200'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                    <span className="text-xl sm:text-2xl">{getCategoryIcon(category)}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                                                        {category.replace('_', ' ')}
                                                        {isMandatory && <span className="text-red-500 ml-1">*</span>}
                                                    </h3>
                                                    <p className="text-xs sm:text-sm text-gray-600">
                                                        {isMandatory ? 'Required' : 'Optional'} • {courseList.length} courses
                                                    </p>
                                                </div>
                                                {preferences[category]?.choice1 && (
                                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                        <svg className="w-3 h-3 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Course Selection */}
                                        <div className="p-4 sm:p-6">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                                {/* First Choice */}
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        🥇 First Choice 
                                                        {isMandatory && <span className="text-red-500 ml-1">*</span>}
                                                    </label>
                                                    <select
                                                        value={preferences[category]?.choice1 || ''}
                                                        onChange={(e) => handlePreferenceChange(category, 'choice1', e.target.value)}
                                                        className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                                                        required={isMandatory}
                                                    >
                                                        <option value="">Select course</option>
                                                        {courseList.map(course => (
                                                            <option key={course.id} value={course.id}>
                                                                {course.name} ({course.credits} credits)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Second Choice */}
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        🥈 Second Choice
                                                    </label>
                                                    <select
                                                        value={preferences[category]?.choice2 || ''}
                                                        onChange={(e) => handlePreferenceChange(category, 'choice2', e.target.value)}
                                                        className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                                                    >
                                                        <option value="">Select backup</option>
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

                                            {/* Selection Preview */}
                                            {(preferences[category]?.choice1 || preferences[category]?.choice2) && (
                                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                                    <div className="text-xs sm:text-sm text-blue-800">
                                                        <span className="font-medium">Selected: </span>
                                                        {preferences[category]?.choice1 && (
                                                            <span>🥇 {preferences[category].choice1}</span>
                                                        )}
                                                        {preferences[category]?.choice1 && preferences[category]?.choice2 && <span className="mx-2">|</span>}
                                                        {preferences[category]?.choice2 && (
                                                            <span>🥈 {preferences[category].choice2}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Important Notes */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-yellow-800 mb-2">Important Guidelines</h4>
                                <ul className="text-sm text-yellow-700 space-y-1">
                                    <li>• All categories marked with ⭐ are mandatory</li>
                                    <li>• MDM course selection is required for all students</li>
                                    <li>• You can choose either Honors OR Minor courses (not both)</li>
                                    <li>• Second choices will be considered if first choice is unavailable</li>
                                    <li>• This saves as draft - you'll need to confirm on the next page</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="sticky bottom-4 sm:bottom-6 bg-white rounded-xl border border-gray-200 shadow-lg p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex-1 text-center sm:text-left">
                                <p className="text-sm text-gray-600">
                                    Progress: <span className="font-semibold text-blue-600">{getCompletedCount()}/7 categories completed</span>
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${getProgressPercentage()}%` }}
                                    ></div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <span>Save & Continue</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PreferenceForm;