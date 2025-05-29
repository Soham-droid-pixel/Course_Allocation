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
    const response = await api.get(`/download/${allocationId}`, {
      params: { format },
      responseType: 'blob'
    })

    // Check if response is an error message (non-blob)
    if (response.data instanceof Blob) {
      const contentType = format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'

      const blob = new Blob([response.data], { type: contentType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `allocation-report-${allocationId}.${format === 'excel' ? 'xlsx' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      return true
    } else {
      throw new Error('Invalid response format')
    }
  } catch (error) {
    if (error.response?.status === 400) {
      throw new Error('Allocation is incomplete - all courses must have students assigned')
    }
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data)
      throw new Error('Failed to generate report - server error')
    }
    throw error
  }
}
