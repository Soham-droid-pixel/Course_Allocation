import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

export const submitPreferences = async (preferences) => {
  try {
    const response = await api.post('/preferences/submit', preferences)
    return response.data
  } catch (error) {
    throw error.response?.data || error.message
  }
}
export const triggerAllocation = async () => {
  try {
    const response = await api.post('/allocate')
    return response.data
  } catch (error) {
    throw error.response?.data || error.message
  }
}

export const downloadReport = async (allocationId, format = 'excel') => {
  try {
    const response = await api.get(`/download/${allocationId}?format=${format}`)
    return response.data
  } catch (error) {
    throw error.response?.data || error.message
  }
}
