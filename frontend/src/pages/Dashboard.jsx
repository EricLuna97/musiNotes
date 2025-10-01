import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

// API base URL - use environment variable or fallback
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Dashboard = ({ user, token, handleLogout }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // API calls with better error handling
  const apiCall = async (endpoint, options = {}) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        ...options,
      };

      const response = await fetch(`${API_BASE}${endpoint}`, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server');
      }
      throw error;
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteError('');

    try {
      await apiCall('/auth/delete-account', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword }),
      });
      // Account deleted successfully, logout
      handleLogout();
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeleteLoading(false);
    }
  };
  return (
    <div className="min-h-screen">
      <Header user={user} handleLogout={handleLogout} />
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="card p-8 mb-8">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-black mb-2">MusiNotes</h1>
              <p className="text-neutral-light">Your songs</p>
            </div>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link
            to="/songs/new"
            className="card p-8 hover:bg-opacity-20 transition-all duration-300 group"
          >
            <h2 className="text-2xl font-semibold text-dark mb-4 group-hover:text-primary transition-colors duration-200">Create New Song</h2>
            <p className="text-neutral-light mb-6">Add a new song with chords and lyrics</p>
            <div className="text-primary font-medium flex items-center">
              → Go to Create
              <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">→</span>
            </div>
          </Link>

          <Link
            to="/songs"
            className="card p-8 hover:bg-opacity-20 transition-all duration-300 group"
          >
            <h2 className="text-2xl font-semibold text-dark mb-4 group-hover:text-primary transition-colors duration-200">My Songs</h2>
            <p className="text-neutral-light mb-6">View, search and manage your songs</p>
            <div className="text-primary font-medium flex items-center">
              → View Songs
              <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">→</span>
            </div>
          </Link>
        </div>

        {/* Delete Account - Less prominent at bottom */}
        <div className="mt-16 text-center">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-neutral-light text-sm hover:text-error transition-colors duration-200 underline decoration-neutral-dark hover:decoration-error"
          >
            Delete Account
          </button>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="card p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-semibold text-techno-light mb-6">Delete Account</h2>
              <p className="text-neutral-light mb-6 leading-relaxed">
                This action cannot be undone. Your account and all your songs will be permanently deleted.
              </p>
              {deleteError && (
                <div className="bg-error bg-opacity-20 border border-error border-opacity-30 text-error p-4 rounded-xl text-sm font-medium mb-6">
                  {deleteError}
                </div>
              )}
              <form onSubmit={handleDeleteAccount} className="space-y-6">
                <input
                  type="password"
                  placeholder="Enter your password to confirm"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="input-field w-full"
                  required
                />
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="flex-1 bg-error text-techno-light py-3 rounded-xl font-medium hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                    className="flex-1 bg-neutral-dark bg-opacity-40 text-neutral-light py-3 rounded-xl font-medium hover:bg-opacity-60 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;