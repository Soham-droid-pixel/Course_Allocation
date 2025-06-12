import axios from 'axios';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper function to ensure all preferences have proper string values
const formatPreferences = (preferences) => {
  const courseCategories = [
    'PECL1', 'PECL2', 'Program Elective', 'Open Elective', 
    'Honors', 'Minor', 'MDM'
  ];
  
  const formatted = {};
  
  courseCategories.forEach(category => {
    const current = preferences[category] || {};
    formatted[category] = {
      choice1: current.choice1 == null ? "" : String(current.choice1).trim(),
      choice2: current.choice2 == null ? "" : String(current.choice2).trim()
    };
  });
  
  return formatted;
};

export const submitPreferences = async (preferences) => {
  try {
    const response = await api.post('/preferences/submit', {
      student_id: preferences.student_id,
      name: preferences.name || "Unknown",
      preferences: formatPreferences(preferences.preferences || {}),
      status: preferences.status || "draft",
      comments: preferences.comments || "",
      updated_at: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to submit preferences');
  }
}

export const triggerAllocation = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/allocate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add empty body since the endpoint expects AllocationRequest
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Ensure we return the expected format
    return {
      allocation_id: data.allocation_id,
      student_allocations: data.student_allocations,
      course_summaries: data.course_summaries,
      issues: data.issues || []
    };
  } catch (error) {
    console.error('Allocation API error:', error);
    throw new Error(error.message || 'Failed to trigger allocation');
  }
};

export const getLatestAllocationId = async () => {
  try {
    const statsResponse = await api.get('/stats')
    const { completedAllocations } = statsResponse.data

    if (!completedAllocations || completedAllocations === 0) {
      throw new Error('No completed allocations available')
    }

    // Get the latest completed allocation
    const response = await api.get('/allocations/latest')
    
    if (!response.data || !response.data.allocation_id) {
      throw new Error('Invalid allocation response format')
    }

    return response.data.allocation_id
  } catch (error) {
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data)
      throw new Error('Server error while fetching allocation')
    }
    throw error
  }
}

export const downloadReport = async (allocationId, format) => {
  try {
    const response = await fetch(`http://localhost:8000/api/download/${allocationId}?format=${format}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Download failed: ${errorText}`);
    }

    // Handle file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allocation_report_${allocationId}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download API error:', error);
    throw new Error(error.message || 'Failed to download report');
  }
};

export const confirmPreferences = async (studentId, data) => {
  try {
    // Ensure all values are properly formatted
    const payload = {
      student_id: studentId,
      name: data.name || "Unknown",
      preferences: formatPreferences(data.preferences || {}),
      confirm: Boolean(data.confirm),
      comments: data.comments == null ? "" : String(data.comments),
      status: data.status || "draft",
      updated_at: data.updated_at || new Date().toISOString()
    };

    console.log('Sending payload:', payload);
    const response = await api.post(`/preferences/${studentId}/confirm`, payload);
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error);
    throw error;
  }
};

export const getPreferenceSummary = async () => {
  const response = await api.get('/admin/summary');
  return response.data;
};

export const getLatestAllocation = async () => {
  try {
    const response = await api.get('/allocations/latest');
    return response.data;
  } catch (error) {
    console.error('Error fetching latest allocation:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch latest allocation');
  }
};

export const getStudentAllocationStatus = async (studentId) => {
  try {
    const response = await api.get(`/student/${studentId}/status`);
    return response.data;
  } catch (error) {
    console.error('Error fetching student status:', error);
    if (error.response?.status === 404) {
      throw new Error('Student not found');
    }
    throw new Error(error.response?.data?.detail || 'Failed to fetch allocation status');
  }
};

export const getPreferencesAnalysis = async () => {
  try {
    const response = await api.get('/admin/preferences-analysis');
    return response.data;
  } catch (error) {
    console.error('Error fetching preferences analysis:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch preferences analysis');
  }
};