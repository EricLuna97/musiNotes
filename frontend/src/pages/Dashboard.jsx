import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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
    <div className="bg-gray-900 min-h-screen text-gray-200 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-green-400">MusiNotes</h1>
              <p className="text-gray-400">¡Tus canciones musicales!</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Usuario: {user.username}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-700 text-white px-4 py-2 rounded-xl hover:bg-red-800"
                >
                  Eliminar Cuenta
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/songs/new"
            className="bg-gray-800 p-6 rounded-2xl shadow-lg hover:bg-gray-700 transition duration-300"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">Crear Nueva Canción</h2>
            <p className="text-gray-400">Agrega una nueva canción con acordes y letras</p>
            <div className="mt-4 text-green-400 font-semibold">→ Ir a Crear</div>
          </Link>

          <Link
            to="/songs"
            className="bg-gray-800 p-6 rounded-2xl shadow-lg hover:bg-gray-700 transition duration-300"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">Mis Canciones</h2>
            <p className="text-gray-400">Ver, buscar y gestionar tus canciones</p>
            <div className="mt-4 text-green-400 font-semibold">→ Ver Canciones</div>
          </Link>

          <Link
            to="/sheetmusic"
            className="bg-gray-800 p-6 rounded-2xl shadow-lg hover:bg-gray-700 transition duration-300"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">Compositor de Partituras</h2>
            <p className="text-gray-400">Crea y edita partituras musicales</p>
            <div className="mt-4 text-green-400 font-semibold">→ Ir al Compositor</div>
          </Link>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg max-w-md w-full mx-4">
              <h2 className="text-2xl font-semibold text-white mb-4">Eliminar Cuenta</h2>
              <p className="text-gray-300 mb-4">
                Esta acción no se puede deshacer. Se eliminarán permanentemente tu cuenta y todas tus canciones.
              </p>
              {deleteError && (
                <div className="bg-red-600 text-white p-3 rounded-xl text-sm mb-4">
                  {deleteError}
                </div>
              )}
              <form onSubmit={handleDeleteAccount}>
                <input
                  type="password"
                  placeholder="Ingresa tu contraseña para confirmar"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                  required
                />
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="flex-1 bg-red-700 text-white py-3 rounded-xl font-bold hover:bg-red-800 disabled:opacity-50"
                  >
                    {deleteLoading ? 'Eliminando...' : 'Eliminar Cuenta'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                    className="flex-1 bg-gray-600 text-white py-3 rounded-xl font-bold hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;