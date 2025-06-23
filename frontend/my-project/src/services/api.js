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

// Create axios instance with better CORS handling
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
  withCredentials: false, // Set to false for CORS issues
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
      // Token expired or invalid
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
      
      const response = await api.post('/auth/login', credentials, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      const { access_token, user } = response.data;
      
      // Store token
      tokenManager.setToken(access_token);
      
      return { token: access_token, user };
    } catch (error) {
      console.error('Login API error:', error);
      console.error('Error response:', error.response);
      
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
      console.log('Signup data:', userData);
      
      const response = await api.post('/auth/register', userData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Signup API error:', error);
      console.error('Error response:', error.response);
      
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

// Individual API functions (for backward compatibility with your existing components)

// Student Dashboard functions
export const getMyAllocationStatus = async () => {
  try {
    const response = await api.get('/api/allocation/status');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getMyPreferences = async () => {
  try {
    const response = await api.get('/api/preferences');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const submitPreferences = async (preferences) => {
  try {
    const response = await api.post('/api/preferences', preferences);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const confirmPreferences = async (preferences) => {
  try {
    const response = await api.post('/api/preferences/confirm', preferences);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getCourses = async () => {
  try {
    const response = await api.get('/api/courses');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getStudentStats = async () => {
  try {
    const response = await api.get('/api/student/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Admin Dashboard functions
export const triggerAllocation = async () => {
  try {
    const response = await api.post('/api/allocate');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const downloadReport = async (format = 'excel') => {
  try {
    const response = await api.get(`/api/reports/download?format=${format}`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `allocation_report.${format}`);
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
    const response = await api.get('/api/allocation/latest');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getStats = async () => {
  try {
    const response = await api.get('/api/admin/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAdminStats = async () => {
  try {
    const response = await api.get('/api/admin/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const runAllocation = async () => {
  try {
    const response = await api.post('/api/allocate');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getReports = async (format = 'excel') => {
  try {
    const response = await api.get(`/api/reports?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAnalytics = async () => {
  try {
    const response = await api.get('/api/analytics');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getPreferencesAnalysis = async () => {
  try {
    const response = await api.get('/api/preferences-analysis');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAllAllocationResults = async () => {
  try {
    const response = await api.get('/api/admin/allocations');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAllPreferences = async () => {
  try {
    const response = await api.get('/api/admin/preferences');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getSystemStats = async () => {
  try {
    const response = await api.get('/api/admin/system-stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const exportData = async (type, format = 'excel') => {
  try {
    const response = await api.get(`/api/export/${type}?format=${format}`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}_export.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Additional utility functions
export const updatePreferences = async (preferences) => {
  try {
    const response = await api.put('/api/preferences', preferences);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const deletePreferences = async () => {
  try {
    const response = await api.delete('/api/preferences');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getNotifications = async () => {
  try {
    const response = await api.get('/api/notifications');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Main API service object (for organized access)
export const apiService = {
  // Student APIs
  getStudentStats,
  submitPreferences,
  confirmPreferences,
  getMyPreferences,
  getMyAllocationStatus,
  getCourses,
  updatePreferences,
  deletePreferences,

  // Admin APIs
  getAdminStats,
  getStats,
  runAllocation,
  triggerAllocation,
  getReports,
  downloadReport,
  getAnalytics,
  getPreferencesAnalysis,
  getAllAllocationResults,
  getAllPreferences,
  getSystemStats,
  exportData,
  getLatestAllocation,

  // Utility APIs
  getNotifications,
  markNotificationRead,
};

// Export default api instance
export default api;