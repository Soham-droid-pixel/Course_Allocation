import axios from 'axios';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const submitPreferences = async (preferences) => {
  try {
    // Format preferences to match backend schema
    const formattedPreferences = {
      student_id: localStorage.getItem('studentId') || 'TEST001',
      name: localStorage.getItem('studentName') || 'Test Student',
      preferences: Object.entries(preferences).reduce((acc, [category, selected]) => ({
        ...acc,
        [category]: {
          choice1: selected[0]?.id || null,
          choice2: selected[1]?.id || null
        }
      }), {})
    };

    const response = await api.post('/preferences/submit', formattedPreferences);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || 'Failed to submit preferences';
    throw new Error(message);
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
export const downloadReport = async (allocationId, format = 'excel') => {
  try {
    const response = await api.get(`/download/${allocationId}?format=${format}`, {
      responseType: 'blob' // Important for file downloads
    })
    
    // Create and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `allocation-report.${format === 'excel' ? 'xlsx' : 'csv'}`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    return true
  } catch (error) {
    throw error.response?.data?.detail || error.message
  }
}
