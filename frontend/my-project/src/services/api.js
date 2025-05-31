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
    // Get all student preferences first
    const allPreferences = await api.get('/preferences');
    
    const response = await api.post('/allocate', {
      students: allPreferences.data // Match the AllocationRequest model
    });
    
    if (response.data.issues?.length > 0) {
      response.data.issues.forEach(issue => {
        toast.warning(issue);
      });
    }
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 422) {
      toast.error('Invalid allocation request format');
    }
    throw error.response?.data?.detail || error.message;
  }
}

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

export const downloadReport = async (allocationId, format = 'excel') => {
    try {
        // First verify the allocation exists
        const verifyResponse = await api.get(`/allocations/${allocationId}`);
        if (!verifyResponse.data) {
            throw new Error('Allocation not found');
        }

        const response = await api.get(
            `/download/${allocationId}?format=${format}`,
            { 
                responseType: 'blob',
                timeout: 30000,
                headers: {
                    'Accept': 'application/octet-stream'
                }
            }
        );
        
        if (!response.data) {
            throw new Error('Empty response received');
        }

        // Handle error responses
        if (response.data.type.includes('application/json')) {
            const text = await response.data.text();
            const error = JSON.parse(text);
            throw new Error(error.detail || 'Download failed');
        }
        
        // Create and trigger download
        const blob = new Blob([response.data], {
            type: format === 'excel' 
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'text/csv'
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Set filename
        const timestamp = new Date().toISOString().split('T')[0];
        const extension = format === 'excel' ? 'xlsx' : 'csv';
        const filename = `allocation_report_${timestamp}.${extension}`;
            
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        link.remove();
        
        return true;
    } catch (error) {
        console.error('Download error:', error);
        if (error.response?.status === 404) {
            throw new Error('Allocation not found');
        }
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
        // First try to get latest allocation ID from stats
        const statsResponse = await api.get('/stats');
        if (!statsResponse.data.completedAllocations) {
            throw new Error('No completed allocations available');
        }

        // Then get the specific allocation details
        const response = await api.get('/allocations/latest');
        const data = response.data;

        if (!data || !data.allocation_id) {
            throw new Error('Invalid allocation data received');
        }

        // Return normalized data
        return {
            allocation_id: data.allocation_id,
            status: data.status || 'unknown',
            created_at: data.created_at || new Date().toISOString(),
            _id: data._id // Include MongoDB ID for reference
        };
    } catch (error) {
        console.error('Error fetching latest allocation:', error);
        if (error.response?.status === 404) {
            throw new Error('No allocations found');
        }
        throw new Error(error.message || 'Failed to fetch latest allocation');
    }
};