
import React from 'react';
import { useAuth } from '../hooks/useAuth.jsx';

const UserBadge = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center space-x-4 bg-white rounded-lg shadow px-4 py-2">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          user.role === 'admin' ? 'bg-blue-500' : 'bg-green-500'
        }`}></div>
        <span className="text-sm font-medium text-gray-700">
          {user.email} ({user.role})
        </span>
      </div>
      <button
        onClick={logout}
        className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
      >
        Logout
      </button>
    </div>
  );
};

export default UserBadge;