import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SongForm from './pages/SongForm';
import SongsList from './pages/SongsList';
import InteractiveSheetMusic from "./components/InteractiveSheetMusic";

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
                <div className="bg-gray-900 min-h-screen text-gray-200 p-8 font-sans">
                  <div className="max-w-md mx-auto">
                    <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
                      <h1 className="text-4xl font-bold text-center text-green-400 mb-6">MusiNotes</h1>
                      <div className="flex justify-center mb-6">
                        <button
                          onClick={() => setIsLogin(true)}
                          className={`px-4 py-2 rounded-l-xl ${isLogin ? 'bg-green-600' : 'bg-gray-700'}`}
                        >
                          Iniciar Sesión
                        </button>
                        <button
                          onClick={() => setIsLogin(false)}
                          className={`px-4 py-2 rounded-r-xl ${!isLogin ? 'bg-green-600' : 'bg-gray-700'}`}
                        >
                          Registrarse
                        </button>
                      </div>
                      <form onSubmit={handleAuth} className="space-y-4">
                        {error && (
                          <div className="bg-red-600 text-white p-3 rounded-xl text-sm">
                            {error}
                          </div>
                        )}
                        {success && (
                          <div className="bg-green-600 text-white p-3 rounded-xl text-sm">
                            {success}
                          </div>
                        )}
                        {!isLogin && (
                          <input
                            type="text"
                            placeholder="Nombre de usuario"
                            value={authForm.username}
                            onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                            className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                            minLength="3"
                            maxLength="50"
                            pattern="[a-zA-Z0-9_]+"
                            title="Only letters, numbers, and underscores allowed"
                          />
                        )}
                        <input
                          type="email"
                          placeholder="Correo electrónico"
                          value={authForm.email}
                          onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                          className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                          required
                        />
                        <input
                          type="password"
                          placeholder="Contraseña"
                          value={authForm.password}
                          onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                          className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                          required
                          minLength="8"
                          title="Password must be at least 8 characters"
                        />
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition duration-300"
                        >
                          {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
                        </button>
                        {isLogin && (
                          <>
                            <div className="mt-4 text-center">
                              <button
                                onClick={handleGoogleLogin}
                                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition duration-300"
                              >
                                Iniciar Sesión con Google
                              </button>
                            </div>
                            <div className="mt-4 text-center">
                              <button
                                onClick={() => setShowForgotPassword(true)}
                                className="text-green-400 hover:text-green-300 text-sm"
                              >
                                ¿Ha olvidado su contraseña?
                              </button>
                            </div>
                          </>
                        )}
                      </form>
                      {showForgotPassword && (
                        <div className="mt-6 bg-gray-700 p-4 rounded-xl">
                          <h3 className="text-lg font-semibold text-white mb-4">Restablecer Contraseña</h3>
                          <form onSubmit={handleForgotPassword}>
                            <input
                              type="email"
                              placeholder="Correo electrónico"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              className="w-full p-3 rounded-xl bg-gray-600 border border-gray-500 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
                              required
                            />
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
                              >
                                {loading ? 'Enviando...' : 'Enviar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowForgotPassword(false)}
                                className="flex-1 bg-gray-600 text-white py-2 rounded-xl font-bold hover:bg-gray-700"
                              >
                                Cancelar
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
          <Route
            path="/sheetmusic"
            element={
              user ? (
                <InteractiveSheetMusic />
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
