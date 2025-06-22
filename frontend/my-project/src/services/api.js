import axios from 'axios';
import { toast } from 'react-hot-toast';

// Use your existing API structure - it uses /api prefix
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management - EXPORT THIS
export const tokenManager = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),
  clearToken: () => localStorage.removeItem('token'), // Add alias for compatibility
  isAuthenticated: () => !!localStorage.getItem('token')
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenManager.removeToken();
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    }
    return Promise.reject(error);
  }
);

// Auth API - NOTE: These are at /auth, not /api/auth
export const authAPI = {
  login: async (credentials) => {
    try {
      console.log('Attempting login with credentials:', credentials);
      
      const response = await api.post('/auth/login', credentials);
      
      console.log('Login response:', response.data);
      
      if (response.data.access_token) {
        tokenManager.setToken(response.data.access_token);
        return {
          token: response.data.access_token,
          user: response.data.user
        };
      }
      
      throw new Error('No access token received');
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      console.log('Attempting registration with data:', userData);
      
      const response = await api.post('/auth/signup', userData);
      
      console.log('Registration response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Add signup alias for backward compatibility
  signup: async (userData) => {
    try {
      console.log('Attempting signup with data:', userData);
      
      const response = await api.post('/auth/signup', userData);
      
      console.log('Signup response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Signup error:', error.response?.data || error.message);
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get current user error:', error.response?.data || error.message);
      throw error;
    }
  },

  logout: () => {
    tokenManager.removeToken();
    localStorage.removeItem('user');
  }
};

// Helper function to get course names
const getCourseName = (courseId) => {
  const courseNames = {
    // PECL1 courses
    '25PECL13CE11': 'Image Processing Lab',
    '25PECL13CE12': 'Natural Language Processing Lab',
    '25PECL13CE13': 'IIOT Lab',
    '25PECL13CE14': 'Innovative Product Development Lab-Phase1',
    '25PECL13CE15': 'Open-Source Intelligence Lab',
    
    // PECL2 courses  
    '25PECL13CE21': 'Social Media Analytics Lab',
    '25PECL13CE22': 'Ethical Hacking Lab',
    '25PECL13CE23': 'DevOps Lab',
    '25PECL13CE24': 'Innovative Product Development Lab-Phase2',
    '25PECL13CE25': 'Explainable AI Lab',
    '25PECL13CE26': 'Software Testing Lab',
    
    // Program Electives
    '25PEC13CE11': 'Blockchain Technology',
    '25PEC13CE12': 'Deep Learning and Reinforcement Learning',
    '25PEC13CE13': 'Cyber Security',
    '25PEC13CE14': 'Big Data Analytics',
    '25PEC13CE15': 'Computer Graphics',
    '25PEC13CE16': 'HMI',
    '25PEC13CE17': 'Geographical Information Systems',
    
    // Open Electives
    'OE1': 'Advanced Microprocessor',
    'OE2': 'Internet of Things',
    'OE3': 'E-Vehicle',
    'OE4': 'Supply Chain Management',
    'OE5': 'Design of Experiments',
    'OE6': '3D Printing',
    
    // Honors
    'H1': 'IoT Honors',
    'H2': 'AI/ML Honors', 
    'H3': 'Data Science Honors',
    'H4': 'Blockchain Honors',
    'H5': 'Cybersecurity Honors',
    
    // Minor
    'M1': 'Robotics Minor',
    'M2': '3D Printing Minor',
    
    // MDM
    'MDM1': 'Emotional and Spiritual Intelligence',
    'MDM2': 'Health, Wellness and Psychology'
  };
  
  return courseNames[courseId] || courseId;
};

// Helper function to transform backend allocation data to frontend format
const transformAllocations = (allocatedCourses) => {
  const transformedAllocations = {};
  
  Object.entries(allocatedCourses).forEach(([category, courseId]) => {
    if (courseId && courseId.trim()) {
      transformedAllocations[category] = {
        course_id: courseId,
        course_name: getCourseName(courseId),
        preference_number: 'Allocated',
        original_preferences: []
      };
    }
  });
  
  return transformedAllocations;
};

// PREFERENCES API - Updated for authentication
export const submitPreferences = async (data) => {
  try {
    // Remove roll_number from data since it comes from authentication
    const { roll_number, ...preferencesData } = data;
    const response = await api.post('/api/preferences/submit', preferencesData);
    return response.data;
  } catch (error) {
    console.error('Error submitting preferences:', error);
    throw error;
  }
};

export const confirmPreferences = async (data) => {
  try {
    console.log('=== API CALL confirmPreferences ===');
    console.log('Input data:', data);
    
    // Simple request - just send the confirm flag and comments
    const requestPayload = {
      confirm: Boolean(data.confirm),  // Ensure boolean
      comments: data.comments || ""
    };
    
    console.log('Request payload:', requestPayload);
    
    const response = await api.post('/api/preferences/confirm', requestPayload);
    
    console.log('API response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    console.error('Error response:', error.response?.data);
    throw error;
  }
};

export const confirmPreferencesFinal = async () => {
  try {
    console.log('Calling confirm-final endpoint');
    const response = await api.post('/api/preferences/confirm-final');
    return response.data;
  } catch (error) {
    console.error('Error confirming final:', error);
    throw error;
  }
};

export const saveDraft = async () => {
  try {
    console.log('Calling save-draft endpoint');
    const response = await api.post('/api/preferences/save-draft');
    return response.data;
  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
};

export const getMyPreferences = async () => {
  try {
    const response = await api.get('/api/preferences/me');
    return response.data;
  } catch (error) {
    console.error('Error fetching preferences:', error);
    throw error;
  }
};

// Make sure this function uses the authenticated endpoint
export const getMyAllocationStatus = async () => {
  try {
    console.log('Fetching allocation status for authenticated user');
    const response = await api.get('/api/student/me/status');  // Uses authentication
    
    // Transform the backend response to match your frontend expectations
    const data = response.data;
    
    return {
      roll_number: data.roll_number,
      name: data.name,
      status: data.allocation_status,
      submission_status: data.preference_status,
      allocations: transformAllocations(data.allocated_courses || {}),
      allocation_date: data.allocation_date
    };
  } catch (error) {
    console.error('Error fetching allocation status:', error);
    throw error;
  }
};

// LEGACY API - For backward compatibility (using student IDs)
export const getPreferences = async (studentId) => {
  try {
    const response = await api.get(`/api/preferences/${studentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching preferences by ID:', error);
    throw error;
  }
};

export const getStudentAllocationStatus = async (studentId) => {
  try {
    const response = await api.get(`/api/student/${studentId}/status`);
    
    // Transform the backend response to match your frontend expectations
    const data = response.data;
    
    return {
      student_id: data.student_id || data.roll_number, // Handle both formats
      roll_number: data.roll_number,
      name: data.name,
      status: data.allocation_status,
      submission_status: data.preference_status,
      allocations: transformAllocations(data.allocated_courses || {}),
      allocation_date: data.allocation_date
    };
  } catch (error) {
    console.error('Error fetching student allocation status:', error);
    // Return a default structure if the API fails
    return {
      student_id: studentId,
      roll_number: studentId,
      name: 'Unknown Student',
      status: 'not_allocated',
      submission_status: 'draft',
      allocations: {},
      allocation_date: null
    };
  }
};

// ADMIN API
export const getStats = async () => {
  try {
    const response = await api.get('/api/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

export const triggerAllocation = async () => {
  try {
    const response = await api.post('/api/allocate');
    return response.data;
  } catch (error) {
    console.error('Error triggering allocation:', error);
    throw error;
  }
};

export const downloadReport = async (allocationId, format = 'excel') => {
  try {
    const response = await api.get(`/api/download/${allocationId}`, {
      params: { format },
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `allocation_report_${allocationId}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
};

export const getAdminSummary = async () => {
  try {
    const response = await api.get('/api/admin/summary');
    return response.data;
  } catch (error) {
    console.error('Error fetching admin summary:', error);
    throw error;
  }
};

export const getLatestAllocation = async () => {
  try {
    const response = await api.get('/api/allocations/latest');
    return response.data;
  } catch (error) {
    console.error('Error fetching latest allocation:', error);
    throw error;
  }
};

// ANALYTICS API
export const getPreferencesAnalysis = async () => {
  try {
    console.log('Fetching preferences analysis...');
    const response = await api.get('/api/admin/preferences-analysis');
    
    console.log('Preferences analysis response:', response.data);
    
    // The backend now returns the data in the correct format
    return response.data;
    
  } catch (error) {
    console.error('Error fetching preferences analysis:', error);
    console.error('Error details:', error.response?.data);
    
    // Return default structure if API fails
    return {
      summary: {
        total_students: 0,
        confirmed_students: 0,
        draft_students: 0,
        completion_rate: 0
      },
      course_demand: {},
      category_analysis: {},
      student_details: []
    };
  }
};

// Helper function to transform course demand data
const transformCourseDemandData = (coursePopularity, categoryStats) => {
  const courseDemand = {};
  
  // Categories to analyze
  const categories = ['PECL1', 'PECL2', 'Program Elective', 'Open Elective', 'MDM', 'Honors', 'Minor'];
  
  categories.forEach(category => {
    courseDemand[category] = {};
    
    const categoryData = categoryStats[category];
    if (!categoryData) return;
    
    // Process first choices
    Object.entries(categoryData.choice1 || {}).forEach(([courseId, count]) => {
      if (!courseDemand[category][courseId]) {
        courseDemand[category][courseId] = {
          course_name: getCourseName(courseId),
          first_choice_count: 0,
          second_choice_count: 0,
          total_demand: 0,
          students_first_choice: [],
          students_second_choice: []
        };
      }
      courseDemand[category][courseId].first_choice_count = count;
      courseDemand[category][courseId].total_demand += count;
    });
    
    // Process second choices
    Object.entries(categoryData.choice2 || {}).forEach(([courseId, count]) => {
      if (!courseDemand[category][courseId]) {
        courseDemand[category][courseId] = {
          course_name: getCourseName(courseId),
          first_choice_count: 0,
          second_choice_count: 0,
          total_demand: 0,
          students_first_choice: [],
          students_second_choice: []
        };
      }
      courseDemand[category][courseId].second_choice_count = count;
      courseDemand[category][courseId].total_demand += count;
    });
  });
  
  return courseDemand;
};

// Helper function to transform category analysis
const transformCategoryAnalysis = (categoryStats) => {
  const analysis = {};
  
  Object.entries(categoryStats).forEach(([category, data]) => {
    const choice1Data = data.choice1 || {};
    const choice2Data = data.choice2 || {};
    
    // Find most popular courses
    const mostPopularFirst = Object.entries(choice1Data).length > 0 
      ? Object.entries(choice1Data).sort(([,a], [,b]) => b - a)[0]
      : null;
    
    const mostPopularSecond = Object.entries(choice2Data).length > 0
      ? Object.entries(choice2Data).sort(([,a], [,b]) => b - a)[0]
      : null;
    
    analysis[category] = {
      students_submitted: Object.keys(choice1Data).length + Object.keys(choice2Data).length,
      total_first_choices: Object.values(choice1Data).reduce((sum, count) => sum + count, 0),
      total_second_choices: Object.values(choice2Data).reduce((sum, count) => sum + count, 0),
      courses_with_demand: new Set([...Object.keys(choice1Data), ...Object.keys(choice2Data)]).size,
      most_popular_first: mostPopularFirst ? {
        course_id: mostPopularFirst[0],
        course_name: getCourseName(mostPopularFirst[0]),
        count: mostPopularFirst[1]
      } : null,
      most_popular_second: mostPopularSecond ? {
        course_id: mostPopularSecond[0],
        course_name: getCourseName(mostPopularSecond[0]),
        count: mostPopularSecond[1]
      } : null
    };
  });
  
  return analysis;
};

// Helper function to get detailed student data
const getStudentDetails = async () => {
  try {
    const summaryResponse = await api.get('/api/admin/summary');
    const summary = summaryResponse.data;
    
    // Since we don't have individual student details from the backend yet,
    // return a simplified structure
    return [];
  } catch (error) {
    console.error('Error fetching student details:', error);
    return [];
  }
};

// ADD this new function:
export const setConfirmedStatus = async () => {
  try {
    console.log('Calling set-confirmed endpoint');
    const response = await api.post('/api/preferences/set-confirmed');
    return response.data;
  } catch (error) {
    console.error('Error setting confirmed status:', error);
    throw error;
  }
};

// Export the axios instance as well for any direct usage
export default api;