import React from 'react';
import { Link } from 'react-router-dom';
import logoText from '../logo-text.svg';

const Header = ({ user, handleLogout }) => {
  return (
    <header className="bg-neutral-dark bg-opacity-10 backdrop-blur-sm border-b border-neutral-dark border-opacity-20 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex justify-between items-center">
          <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200">
            <img src={logoText} alt="MusiNotes Logo" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-neutral-light">Welcome back,</p>
              <p className="text-techno-light font-medium">{user.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-neutral-dark bg-opacity-40 text-neutral-light px-4 py-2 rounded-xl font-medium hover:bg-opacity-60 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;