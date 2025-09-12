import React, { useState, useEffect } from 'react';

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
  const [songs, setSongs] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songAlbum, setSongAlbum] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [songToDelete, setSongToDelete] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // --- ESTADO Y FUNCIONES PARA EDITAR CANCIONES ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [songToEdit, setSongToEdit] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedArtist, setEditedArtist] = useState('');
  const [editedAlbum, setEditedAlbum] = useState('');

  const apiBaseUrl = 'http://localhost:3001';

  const fetchSongs = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${apiBaseUrl}/songs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 403) {
        setLoginError('Tu sesión ha expirado. Por favor, recarga la página.');
        localStorage.clear();
        setToken(null);
        setUserId(null);
        return;
      }
      
      const data = await response.json();
      setSongs(data);
    } catch (error) {
      console.error('Error al obtener canciones:', error);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch(`${apiBaseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: username, password })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user_id);
        setToken(data.token);
        setUserId(data.user_id);
        setUsername('');
        setPassword('');
      } else {
        setLoginError(data.error);
      }
    } catch (error) {
      console.error('Error de login:', error);
      setLoginError('Error de conexión. Inténtalo de nuevo.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUserId(null);
    setSongs([]);
  };

  const handleAddSong = async (e) => {
    e.preventDefault();
    if (!songTitle || !songArtist) {
      setMessage({ text: 'El título y el artista son obligatorios.', type: 'error' });
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: songTitle, artist: songArtist, album: songAlbum })
      });
      const data = await response.json();
      if (response.ok) {
        fetchSongs();
        setSongTitle('');
        setSongArtist('');
        setSongAlbum('');
        setMessage({ text: '¡Canción agregada!', type: 'success' });
      } else {
        setMessage({ text: data.error || 'Error al agregar la canción.', type: 'error' });
      }
    } catch (error) {
      console.error('Error al agregar canción:', error);
      setMessage({ text: 'Error de conexión. Inténtalo de nuevo.', type: 'error' });
    }
  };

  const handleDeleteClick = (song) => {
    setSongToDelete(song);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!songToDelete) return;
    try {
      const response = await fetch(`${apiBaseUrl}/songs/${songToDelete.song_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchSongs();
        setMessage({ text: 'Canción eliminada correctamente.', type: 'success' });
      } else {
        const data = await response.json();
        setMessage({ text: data.error || 'No se pudo eliminar la canción.', type: 'error' });
      }
    } catch (error) {
      console.error('Error al eliminar canción:', error);
      setMessage({ text: 'Error de conexión. Inténtalo de nuevo.', type: 'error' });
    }
    setShowModal(false);
    setSongToDelete(null);
  };

  const cancelDelete = () => {
    setShowModal(false);
    setSongToDelete(null);
  };

  // --- FUNCIONES Y MANEJADORES DE EDICIÓN ---
  const handleEditClick = (song) => {
    setSongToEdit(song);
    setEditedTitle(song.title);
    setEditedArtist(song.artist);
    setEditedAlbum(song.album);
    setShowEditModal(true);
  };

  const handleUpdateSong = async (e) => {
    e.preventDefault();
    if (!songToEdit) return;

    try {
      const response = await fetch(`${apiBaseUrl}/songs/${songToEdit.song_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: editedTitle, artist: editedArtist, album: editedAlbum })
      });

      if (response.ok) {
        fetchSongs(); 
        setShowEditModal(false);
        setSongToEdit(null);
        setMessage({ text: 'Canción actualizada correctamente.', type: 'success' });
      } else {
        const data = await response.json();
        setMessage({ text: data.error || 'No se pudo actualizar la canción.', type: 'error' });
      }
    } catch (error) {
      console.error('Error al actualizar canción:', error);
      setMessage({ text: 'Error de conexión. Inténtalo de nuevo.', type: 'error' });
    }
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setSongToEdit(null);
  };

  const renderContent = () => {
    if (!token) {
      return (
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
          <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-6">Iniciar Sesión</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Entrar
            </button>
          </form>
          {loginError && <p className="text-red-500 text-center mt-4">{loginError}</p>}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-8 w-full max-w-4xl">
        <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">MusiNotes</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 font-medium">ID de usuario: <span className="font-mono text-xs">{userId}</span></span>
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
              Cerrar Sesión
            </button>
          </div>
        </header>

        <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Agregar Nueva Canción</h2>
          <form onSubmit={handleAddSong} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Título"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
            <input
              type="text"
              placeholder="Artista"
              value={songArtist}
              onChange={(e) => setSongArtist(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
            <input
              type="text"
              placeholder="Álbum (Opcional)"
              value={songAlbum}
              onChange={(e) => setSongAlbum(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
            <button
              type="submit"
              className="w-full md:col-span-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              <span className="mr-2">+</span>
              Agregar Canción
            </button>
          </form>
          {message.text && (
            <div className={`mt-4 p-3 rounded-lg text-white ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
              {message.text}
            </div>
          )}
        </section>

        <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Mi Lista de Canciones ({songs.length})</h2>
          {songs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aún no has agregado ninguna canción.</p>
          ) : (
            <ul className="space-y-4">
              {songs.map(song => (
                <li key={song.song_id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex-1">
                    <div className="font-bold text-lg text-gray-800">{song.title}</div>
                    <div className="text-sm text-gray-600">
                      {song.artist}{song.album && <span className="ml-2 text-gray-400">({song.album})</span>}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleEditClick(song)} className="text-blue-500 hover:text-blue-700 transition-colors">
                      <span className="w-5 h-5">&#x270E;</span>
                    </button>
                    <button onClick={() => handleDeleteClick(song)} className="text-red-500 hover:text-red-700 transition-colors">
                      <span className="w-5 h-5">&#x1F5D1;</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {showModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm text-center">
              <span className="text-yellow-500 text-5xl mb-4">&#x26A0;</span>
              <h3 className="text-lg font-bold mb-2 text-gray-800">¿Estás seguro?</h3>
              <p className="text-gray-600 mb-6">Esta acción eliminará la canción "{songToDelete?.title}" de forma permanente.</p>
              <div className="flex justify-center gap-4">
                <button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  Eliminar
                </button>
                <button onClick={cancelDelete} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de edición de canción */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
              <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Editar Canción</h3>
              <form onSubmit={handleUpdateSong} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Título</label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Artista</label>
                  <input
                    type="text"
                    value={editedArtist}
                    onChange={(e) => setEditedArtist(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Álbum</label>
                  <input
                    type="text"
                    value={editedAlbum}
                    onChange={(e) => setEditedAlbum(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div className="flex justify-center gap-4 mt-6">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                  >
                    Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="container mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
