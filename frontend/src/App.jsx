import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SongForm from './pages/SongForm';
import SongsList from './pages/SongsList';
import logo from './logo.svg';

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
  const [showPassword, setShowPassword] = useState(false);

  // Check for token in URL (for Google OAuth)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlError = urlParams.get('error');

    if (urlError) {
      setError('Google authentication failed. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (urlToken) {
      setToken(urlToken);
      localStorage.setItem('token', urlToken);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Fetch user data with the new token
      fetchUserData(urlToken);
    }
  }, []);

  // Function to fetch user data (used for Google OAuth)
  const fetchUserData = async (authToken) => {
    try {
      // Decode JWT to get user info (simple decode, not secure validation)
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      setUser({
        id: payload.id,
        username: payload.username,
        email: payload.email
      });
    } catch (error) {
      console.error('Error decoding token:', error);
      // Fallback: try to get user data from API
      try {
        const response = await fetch(`${API_BASE}/songs?limit=1`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (response.ok) {
          // If API call succeeds, token is valid, but we don't have user data
          // For now, just set a placeholder user - the dashboard will handle this
          setUser({ id: 'unknown', username: 'User', email: 'user@example.com' });
        }
      } catch (apiError) {
        console.error('Token validation failed:', apiError);
        setError('Authentication failed. Please try logging in again.');
        setToken(null);
        localStorage.removeItem('token');
      }
    }
  };

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
                <div className="min-h-screen p-8">
                  <div className="max-w-md mx-auto">
                    <div className="card p-8">
                      <div className="flex justify-center mb-8">
                        <img src={logo} alt="MusiNotes Logo" className="h-16 w-auto" />
                      </div>
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
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={authForm.password}
                            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                            className="input-field w-full pr-12"
                            required
                            minLength="8"
                            title="Password must be at least 8 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-light hover:text-primary transition-colors duration-200"
                          >
                            {showPassword ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
                        </button>
                        <div className="mt-6 text-center">
                          <button
                            onClick={handleGoogleLogin}
                            className="w-full bg-secondary text-techno-light py-3 rounded-xl font-medium hover:bg-opacity-80 transition-all duration-200"
                          >
                            {isLogin ? 'Login' : 'Register'} with Google
                          </button>
                        </div>
                        {isLogin && (
                          <div className="mt-6 text-center">
                            <button
                              onClick={() => setShowForgotPassword(true)}
                              className="text-primary hover:text-primary-dark text-sm font-medium transition-colors duration-200"
                            >
                              Forgot your password?
                            </button>
                          </div>
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
