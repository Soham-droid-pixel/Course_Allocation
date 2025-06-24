import axios from 'axios';
import { toast } from 'react-hot-toast';

// Use environment variable or fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://course-allocation-02wj.onrender.com';

console.log('🔗 API Base URL:', API_BASE_URL);

// Token management utilities
export const tokenManager = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      // Check if token is expired (basic check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
  withCredentials: false,
});

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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      tokenManager.removeToken();
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.');
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  login: async (credentials) => {
    try {
      console.log('🔐 Attempting login to:', `${API_BASE_URL}/auth/login`);
      
      const response = await api.post('/auth/login', credentials);
      const { access_token, user } = response.data;
      
      tokenManager.setToken(access_token);
      return { token: access_token, user };
    } catch (error) {
      console.error('Login API error:', error);
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.detail || 'Invalid credentials');
      } else if (error.response?.status === 422) {
        throw new Error('Please check your email and password format');
      } else if (error.code === 'ERR_NETWORK') {
        throw new Error('Network error. Please check your connection.');
      }
      
      throw error.response?.data || error;
    }
  },

  signup: async (userData) => {
    try {
      console.log('📝 Attempting signup to:', `${API_BASE_URL}/auth/register`);
      
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Signup API error:', error);
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.detail || 'Registration failed');
      } else if (error.response?.status === 422) {
        const details = error.response.data?.detail;
        if (Array.isArray(details)) {
          const errorMessages = details.map(d => d.msg).join(', ');
          throw new Error(`Validation error: ${errorMessages}`);
        }
        throw new Error('Please check your input format');
      } else if (error.code === 'ERR_NETWORK') {
        throw new Error('Network error. Please check your connection.');
      }
      
      throw error.response?.data || error;
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  logout: () => {
    tokenManager.removeToken();
    localStorage.removeItem('user');
  }
};

// ==================== CORRECTED API FUNCTIONS ====================

// Student API functions - CORRECTED ENDPOINTS
export const getMyAllocationStatus = async () => {
  try {
    // CORRECTED: Use the actual backend endpoint
    const response = await api.get('/api/student/me/status');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getMyPreferences = async () => {
  try {
    // CORRECTED: Use the actual backend endpoint
    const response = await api.get('/api/preferences/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const submitPreferences = async (preferences) => {
  try {
    // CORRECTED: Use the actual backend endpoint
    const response = await api.post('/api/preferences/submit', preferences);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const confirmPreferences = async (preferences) => {
  try {
    console.log('📝 Confirming preferences:', preferences);
    
    const response = await api.post('/api/preferences/confirm', preferences);
    return response.data;
  } catch (error) {
    console.error('Confirm preferences error:', error);
    
    if (error.response?.status === 422) {
      throw new Error('Invalid data format. Please check your preferences.');
    } else if (error.response?.status === 404) {
      throw new Error('Student preferences not found. Please submit preferences first.');
    }
    
    throw error.response?.data || error;
  }
};

// ADD: Simple boolean-based confirmation functions
export const confirmPreferencesFinal = async () => {
  try {
    const response = await api.post('/api/preferences/set-confirmed');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const savePreferencesDraft = async () => {
  try {
    const response = await api.post('/api/preferences/save-draft');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getCourses = async () => {
  try {
    // This endpoint doesn't exist in backend - create mock data or remove
    console.warn('getCourses endpoint not implemented in backend');
    return {
      courses: [
        { id: '25PECL13CE11', name: 'Image Processing Lab', category: 'PECL1' },
        { id: '25PECL13CE12', name: 'Natural Language Processing Lab', category: 'PECL1' },
        // Add more mock courses as needed
      ]
    };
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getStudentStats = async () => {
  try {
    // CORRECTED: Use the actual backend endpoint
    const response = await api.get('/api/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Admin API functions - CORRECTED ENDPOINTS
export const triggerAllocation = async () => {
  try {
    // CORRECTED: Use the actual backend endpoint
    const response = await api.post('/api/allocate');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const runAllocation = async () => {
  try {
    // Same as triggerAllocation
    const response = await api.post('/api/allocate');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const downloadReport = async (allocationId, format = 'excel') => {
  try {
    // CORRECTED: Use the actual backend endpoint with allocation ID
    const response = await api.get(`/api/download/${allocationId}?format=${format}`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `allocation_report_${allocationId}.${format === 'excel' ? 'xlsx' : 'csv'}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getLatestAllocation = async () => {
  try {
    // CORRECTED: Use the actual backend endpoint
    const response = await api.get('/api/allocations/latest');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getStats = async () => {
  try {
    // CORRECTED: Use the actual backend endpoint
    const response = await api.get('/api/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAdminStats = async () => {
  try {
    // CORRECTED: Use the actual backend endpoint
    const response = await api.get('/api/admin/summary');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getPreferencesAnalysis = async () => {
  try {
    // CORRECTED: Use the actual backend endpoint
    const response = await api.get('/api/admin/preferences-analysis');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Legacy/Missing endpoints - these don't exist in backend
export const getReports = async (format = 'excel') => {
  try {
    console.warn('getReports endpoint not implemented - use downloadReport instead');
    // Get latest allocation and download its report
    const latest = await getLatestAllocation();
    if (latest.allocation_id) {
      return await downloadReport(latest.allocation_id, format);
    }
    throw new Error('No allocation found to generate report');
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAnalytics = async () => {
  try {
    // Use preferences analysis as analytics
    const response = await api.get('/api/admin/preferences-analysis');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAllAllocationResults = async () => {
  try {
    // Use latest allocation
    const response = await api.get('/api/allocations/latest');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAllPreferences = async () => {
  try {
    // Use admin summary
    const response = await api.get('/api/admin/summary');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getSystemStats = async () => {
  try {
    // Use general stats
    const response = await api.get('/api/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const exportData = async (type, format = 'excel') => {
  try {
    console.warn('exportData endpoint not implemented - use downloadReport instead');
    const latest = await getLatestAllocation();
    if (latest.allocation_id) {
      return await downloadReport(latest.allocation_id, format);
    }
    throw new Error('No allocation found to export');
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Utility functions
export const updatePreferences = async (preferences) => {
  try {
    // Use submit preferences endpoint
    const response = await api.post('/api/preferences/submit', preferences);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const deletePreferences = async () => {
  try {
    console.warn('deletePreferences endpoint not implemented');
    throw new Error('Delete preferences not supported');
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getNotifications = async () => {
  try {
    console.warn('getNotifications endpoint not implemented');
    return { notifications: [] };
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    console.warn('markNotificationRead endpoint not implemented');
    return { success: true };
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Main API service object
export const apiService = {
  // Student APIs
  getStudentStats,
  submitPreferences,
  confirmPreferences,
  confirmPreferencesFinal,
  savePreferencesDraft,
  getMyPreferences,
  getMyAllocationStatus,
  getCourses,
  updatePreferences,

  // Admin APIs
  getAdminStats,
  getStats,
  runAllocation,
  triggerAllocation,
  downloadReport,
  getLatestAllocation,
  getPreferencesAnalysis,
  getAnalytics,
  getAllAllocationResults,
  getAllPreferences,
  getSystemStats,
  exportData,

  // Utility APIs
  getNotifications,
  markNotificationRead,
};

// Export default api instance
export default api;