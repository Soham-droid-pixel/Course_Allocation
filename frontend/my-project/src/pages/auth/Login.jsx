import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { login } from '../../services/auth'

function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // Quick login buttons for development
  const quickLogin = (role) => {
    const mockCredentials = {
      student: { email: 'student@test.com', password: 'student123' },
      admin: { email: 'admin@test.com', password: 'admin123' }
    }
    handleSubmit(null, mockCredentials[role])
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e, mockData = null) => {
    if (e) e.preventDefault()
    setLoading(true)

    try {
      const dataToSubmit = mockData || formData
      const user = await login(dataToSubmit)
      toast.success(`Welcome ${user.role}!`)
      
      if (user.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/student/dashboard')
      }
    } catch (error) {
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8 space-y-8">
          <div>
            <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
              Course Allocation System
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to your account
            </p>
          </div>

          {/* Quick Login Buttons for Development */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => quickLogin('student')}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              Quick Student Login
            </button>
            <button
              onClick={() => quickLogin('admin')}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Quick Admin Login
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-t-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-b-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login