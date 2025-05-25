import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

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
        { id: 'CS101', name: 'Image Processing Lab', credits: 1 },
        { id: 'CS102', name: 'NLP Lab', credits: 1 },
        { id: 'CS103', name: 'IoT Lab', credits: 1 }
    ],
    [CourseCategory.PECL2]: [
        { id: 'CS201', name: 'Social Media Analytics Lab', credits: 1 },
        { id: 'CS202', name: 'Ethical Hacking Lab', credits: 1 },
        { id: 'CS203', name: 'DevOps Lab', credits: 1 }
    ],
    [CourseCategory.MDM]: [
        { id: 'MDM101', name: 'Health, Wellness, Psychology', credits: 1 },
        { id: 'MDM102', name: 'Emotional and Spiritual Intelligence', credits: 1 },
        { id: 'MDM103', name: 'Professional Ethics', credits: 1 }
    ],
    // ...add other course categories
};

function PreferenceForm() {
    const [preferences, setPreferences] = useState({});
    const [loading, setLoading] = useState(false);
    const [enrollmentCounts, setEnrollmentCounts] = useState({});

    useEffect(() => {
        fetchEnrollmentCounts();
    }, []);

    const fetchEnrollmentCounts = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/courses/enrollment');
            const data = await response.json();
            setEnrollmentCounts(data);
        } catch (error) {
            console.error('Error fetching enrollment counts:', error);
        }
    };

    const handlePreferenceChange = (category, choiceType, value) => {
        setPreferences(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [choiceType]: value
            }
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate MDM selection
            if (!preferences.MDM?.choice1) {
                throw new Error('MDM course selection is mandatory');
            }

            // Check if either Honors or Minor is selected (optional)
            const hasHonorsOrMinor = preferences.Honors?.choice1 || preferences.Minor?.choice1;
            if (!hasHonorsOrMinor) {
                toast.info('Consider selecting either Honors or Minor courses');
            }

            const response = await fetch('http://localhost:8000/api/preferences/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: localStorage.getItem('studentId'),
                    name: localStorage.getItem('studentName'),
                    preferences
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail);
            }

            toast.success('Preferences submitted successfully');
            setPreferences({});
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6">Course Preference Selection</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
                {Object.entries(courses).map(([category, courseList]) => (
                    <div key={category} className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4">{category.replace('_', ' ')}</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Choice
                                </label>
                                <select
                                    value={preferences[category]?.choice1 || ''}
                                    onChange={(e) => handlePreferenceChange(category, 'choice1', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    required={category === CourseCategory.MDM}
                                >
                                    <option value="">Select course</option>
                                    {courseList.map(course => (
                                        <option key={course.id} value={course.id}>{course.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Second Choice
                                </label>
                                <select
                                    value={preferences[category]?.choice2 || ''}
                                    onChange={(e) => handlePreferenceChange(category, 'choice2', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    disabled={!preferences[category]?.choice1}
                                >
                                    <option value="">Select course</option>
                                    {courseList
                                        .filter(course => course.id !== preferences[category]?.choice1)
                                        .map(course => (
                                            <option key={course.id} value={course.id}>{course.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="flex justify-end mt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit Preferences'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default PreferenceForm;