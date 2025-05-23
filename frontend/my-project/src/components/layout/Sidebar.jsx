import { NavLink } from 'react-router-dom'
import { getUser } from '../../services/auth'

function Sidebar() {
  const user = getUser()
  const isAdmin = user?.role === 'admin'

  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard' },
    { to: '/student/preferences', label: 'Course Preferences' },
    { to: '/student/status', label: 'Allocation Status' }
  ]

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/analytics', label: 'Analytics' }
  ]

  const links = isAdmin ? adminLinks : studentLinks

  return (
    <nav className="w-64 bg-white shadow-lg min-h-screen p-4">
      <div className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block px-4 py-2 rounded-lg ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default Sidebar;