const MOCK_USERS = {
  'student@test.com': {
    id: 1,
    email: 'student@test.com',
    role: 'student',
    name: 'Test Student'
  },
  'admin@test.com': {
    id: 2,
    email: 'admin@test.com',
    role: 'admin',
    name: 'Test Admin'
  }
}

export const login = async (credentials) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const user = MOCK_USERS[credentials.email]
  if (user) {
    localStorage.setItem('user', JSON.stringify(user))
    return user
  }
  throw new Error('Invalid credentials')
}

// Legacy auth functions for backward compatibility
// This file can be removed once all components are updated

export const getUser = () => {
  try {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  } catch (error) {
    console.error('Error parsing user from localStorage:', error)
    return null
  }
}

export const isAuthenticated = () => {
  return !!localStorage.getItem('token')
}

export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}