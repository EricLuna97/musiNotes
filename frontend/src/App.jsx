import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SongForm from './pages/SongForm';
import SongsList from './pages/SongsList';

// API base URL - use environment variable or fallback
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Check for token in URL (for Google OAuth)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      localStorage.setItem('token', urlToken);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const { token: newToken, user: userData } = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(authForm),
      });

      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      setAuthForm({ username: '', email: '', password: '' });
      setSuccess(isLogin ? 'Login successful!' : 'Registration successful!');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const handleGoogleLogin = async () => {
    try {
      // First check if Google OAuth is configured by making a request
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'GET',
        redirect: 'manual' // Prevent automatic redirect
      });

      if (response.status === 400) {
        const errorData = await response.json();
        setError(errorData.message || 'Google authentication is not available. Please configure Google OAuth credentials.');
        return;
      }

      // If configured, proceed with redirect
      window.location.href = `${API_BASE}/auth/google`;
    } catch (error) {
      setError('Unable to connect to authentication service');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiCall('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });
      setSuccess('If an account with that email exists, a reset link has been sent.');
      setForgotPasswordEmail('');
      setShowForgotPassword(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <div className="min-h-screen bg-background p-8">
                  <div className="max-w-md mx-auto">
                    <div className="card p-8">
                      <h1 className="text-4xl font-bold text-center text-primary mb-8">MusiNotes</h1>
                      <div className="flex justify-center mb-8">
                        <button
                          onClick={() => setIsLogin(true)}
                          className={`px-6 py-3 rounded-l-xl font-medium transition-all duration-200 ${
                            isLogin
                              ? 'bg-primary text-techno-light'
                              : 'bg-neutral-dark bg-opacity-20 text-neutral-light hover:bg-opacity-30'
                          }`}
                        >
                          Login
                        </button>
                        <button
                          onClick={() => setIsLogin(false)}
                          className={`px-6 py-3 rounded-r-xl font-medium transition-all duration-200 ${
                            !isLogin
                              ? 'bg-primary text-techno-light'
                              : 'bg-neutral-dark bg-opacity-20 text-neutral-light hover:bg-opacity-30'
                          }`}
                        >
                          Register
                        </button>
                      </div>
                      <form onSubmit={handleAuth} className="space-y-6">
                        {error && (
                          <div className="bg-error bg-opacity-20 border border-error border-opacity-30 text-error p-4 rounded-xl text-sm font-medium">
                            {error}
                          </div>
                        )}
                        {success && (
                          <div className="bg-success bg-opacity-20 border border-success border-opacity-30 text-success p-4 rounded-xl text-sm font-medium">
                            {success}
                          </div>
                        )}
                        {!isLogin && (
                          <input
                            type="text"
                            placeholder="Username"
                            value={authForm.username}
                            onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                            className="input-field w-full"
                            required
                            minLength="3"
                            maxLength="50"
                            pattern="[a-zA-Z0-9_]+"
                            title="Only letters, numbers, and underscores allowed"
                          />
                        )}
                        <input
                          type="email"
                          placeholder="Email"
                          value={authForm.email}
                          onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                          className="input-field w-full"
                          required
                        />
                        <input
                          type="password"
                          placeholder="Password"
                          value={authForm.password}
                          onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                          className="input-field w-full"
                          required
                          minLength="8"
                          title="Password must be at least 8 characters"
                        />
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
                        </button>
                        {isLogin && (
                          <>
                            <div className="mt-6 text-center">
                              <button
                                onClick={handleGoogleLogin}
                                className="w-full bg-secondary text-techno-light py-3 rounded-xl font-medium hover:bg-opacity-80 transition-all duration-200"
                              >
                                Login with Google
                              </button>
                            </div>
                            <div className="mt-6 text-center">
                              <button
                                onClick={() => setShowForgotPassword(true)}
                                className="text-primary hover:text-primary-dark text-sm font-medium transition-colors duration-200"
                              >
                                Forgot your password?
                              </button>
                            </div>
                          </>
                        )}
                      </form>
                      {showForgotPassword && (
                        <div className="mt-8 card p-6">
                          <h3 className="text-xl font-semibold text-techno-light mb-6">Reset Password</h3>
                          <form onSubmit={handleForgotPassword} className="space-y-4">
                            <input
                              type="email"
                              placeholder="Email"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              className="input-field w-full"
                              required
                            />
                            <div className="flex gap-3">
                              <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loading ? 'Sending...' : 'Send'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowForgotPassword(false)}
                                className="flex-1 bg-neutral-dark bg-opacity-40 text-neutral-light py-3 rounded-xl font-medium hover:bg-opacity-60 transition-all duration-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              user ? (
                <Dashboard user={user} token={token} handleLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/songs"
            element={
              user ? (
                <SongsList
                  token={token}
                  user={user}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/songs/new"
            element={
              user ? (
                <SongForm
                  token={token}
                  user={user}
                  error={error}
                  success={success}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/songs/:id/edit"
            element={
              user ? (
                <SongForm
                  token={token}
                  user={user}
                  error={error}
                  success={success}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
