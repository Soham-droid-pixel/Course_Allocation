import { useNavigate } from 'react-router-dom'
import { logout, getUser } from '../../services/auth'

function Header() {
  const navigate = useNavigate()
  const user = getUser()

  return (
    <header className="bg-primary text-white shadow-lg">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Course Allocation System</h1>
        <div className="flex items-center space-x-4">
          <span>{user?.email}</span>
          <button 
            onClick={logout}
            className="px-4 py-2 bg-secondary rounded hover:bg-blue-800"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header