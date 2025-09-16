import React, { useState, useEffect } from 'react';

// API base URL
const API_BASE = 'http://localhost:3001/api';

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [songForm, setSongForm] = useState({
    title: '', artist: '', album: '', genre: '', lyrics: '', chords: ''
  });
  const [editingSong, setEditingSong] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    if (token) {
      fetchSongs();
    }
  }, [token]);

  // API calls
  const apiCall = async (endpoint, options = {}) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    };
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'API error');
    return data;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
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
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSongs = async () => {
    try {
      const data = await apiCall('/songs');
      setSongs(data);
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  const handleSongSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingSong) {
        await apiCall(`/songs/${editingSong.song_id}`, {
          method: 'PUT',
          body: JSON.stringify(songForm),
        });
        setEditingSong(null);
      } else {
        await apiCall('/songs', {
          method: 'POST',
          body: JSON.stringify(songForm),
        });
      }
      setSongForm({ title: '', artist: '', album: '', genre: '', lyrics: '', chords: '' });
      fetchSongs();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSong = (song) => {
    setEditingSong(song);
    setSongForm({
      title: song.title,
      artist: song.artist,
      album: song.album || '',
      genre: song.genre || '',
      lyrics: song.lyrics || '',
      chords: song.chords || '',
    });
  };

  const handleDeleteSong = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta canción?')) return;
    try {
      await apiCall(`/songs/${id}`, { method: 'DELETE' });
      fetchSongs();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setSongs([]);
    localStorage.removeItem('token');
  };

  if (!user) {
    return (
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
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                  required
                />
              )}
              <input
                type="email"
                placeholder="Correo electrónico"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

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
              <button
                onClick={handleLogout}
                className="mt-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">
            {editingSong ? 'Editar Canción' : 'Agregar Nueva Canción'}
          </h2>
          <form onSubmit={handleSongSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Título"
                value={songForm.title}
                onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                className="p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                required
              />
              <input
                type="text"
                placeholder="Artista"
                value={songForm.artist}
                onChange={(e) => setSongForm({ ...songForm, artist: e.target.value })}
                className="p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
                required
              />
              <input
                type="text"
                placeholder="Álbum"
                value={songForm.album}
                onChange={(e) => setSongForm({ ...songForm, album: e.target.value })}
                className="p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="Género"
                value={songForm.genre}
                onChange={(e) => setSongForm({ ...songForm, genre: e.target.value })}
                className="p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            <textarea
              placeholder="Letras"
              value={songForm.lyrics}
              onChange={(e) => setSongForm({ ...songForm, lyrics: e.target.value })}
              className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 h-32"
            />
            <textarea
              placeholder="Acordes (JSON array)"
              value={songForm.chords}
              onChange={(e) => setSongForm({ ...songForm, chords: e.target.value })}
              className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 h-32"
            />
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : (editingSong ? 'Actualizar' : 'Guardar')}
              </button>
              {editingSong && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSong(null);
                    setSongForm({ title: '', artist: '', album: '', genre: '', lyrics: '', chords: '' });
                  }}
                  className="bg-gray-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-gray-700"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold text-white mb-4">Mis Canciones</h2>
          {songs.length === 0 ? (
            <p className="text-gray-400">Todavía no tienes canciones. ¡Agrega la primera!</p>
          ) : (
            <div className="space-y-4">
              {songs.map((song) => (
                <div key={song.song_id} className="bg-gray-700 p-4 rounded-xl shadow-inner border border-gray-600">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{song.title}</h3>
                      <p className="text-gray-300">{song.artist} {song.album && `- ${song.album}`}</p>
                      {song.genre && <p className="text-sm text-gray-400">{song.genre}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSong(song)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteSong(song.song_id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {song.lyrics && (
                    <div className="mt-4">
                      <h4 className="text-lg font-medium text-gray-200 mb-2">Letras:</h4>
                      <pre className="text-gray-300 whitespace-pre-wrap">{song.lyrics}</pre>
                    </div>
                  )}
                  {song.chords && (
                    <div className="mt-4">
                      <h4 className="text-lg font-medium text-gray-200 mb-2">Acordes:</h4>
                      <pre className="text-gray-300">{song.chords}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
