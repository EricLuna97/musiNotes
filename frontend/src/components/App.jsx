import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';

const apiBaseUrl = 'http://localhost:3001';

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
  const [songGenre, setSongGenre] = useState('');
  const [songLyrics, setSongLyrics] = useState('');
  const [songChords, setSongChords] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [songToDelete, setSongToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [songToEdit, setSongToEdit] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedArtist, setEditedArtist] = useState('');
  const [editedAlbum, setEditedAlbum] = useState('');
  const [editedLyrics, setEditedLyrics] = useState('');
  const [editedChords, setEditedChords] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  const uniqueGenres = [...new Set(songs.map(song => song.genre).filter(Boolean))];

  const fetchSongs = async () => {
    if (!token) return;

    try {
      const query = new URLSearchParams();
      if (searchTerm) query.append('title', searchTerm);
      if (selectedGenre) query.append('genre', selectedGenre);

      const response = await fetch(`${apiBaseUrl}/songs/search?${query.toString()}`, {
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
  }, [token, searchTerm, selectedGenre]);

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
        localStorage.setItem('userId', data.id);
        setToken(data.token);
        setUserId(data.id);
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
        body: JSON.stringify({ title: songTitle, artist: songArtist, album: songAlbum, genre: songGenre, lyrics: songLyrics, chords: songChords })
      });
      const data = await response.json();
      if (response.ok) {
        fetchSongs();
        setSongTitle('');
        setSongArtist('');
        setSongAlbum('');
        setSongGenre('');
        setSongLyrics('');
        setSongChords('');
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

  const handleEditClick = (song) => {
    setSongToEdit(song);
    setEditedTitle(song.title);
    setEditedArtist(song.artist);
    setEditedAlbum(song.album);
    setEditedLyrics(song.lyrics);
    setEditedChords(song.chords);
    setShowEditModal(true);
  };

  const handleUpdateSong = async (e) => {
    e.preventDefault();
    if (!editedTitle || !editedArtist) {
      setMessage({ text: 'El título y el artista son obligatorios.', type: 'error' });
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/songs/${songToEdit.song_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: editedTitle, artist: editedArtist, album: editedAlbum, lyrics: editedLyrics, chords: editedChords })
      });

      const data = await response.json();
      if (response.ok) {
        fetchSongs();
        setShowEditModal(false);
        setMessage({ text: '¡Canción actualizada!', type: 'success' });
      } else {
        setMessage({ text: data.error || 'Error al actualizar la canción.', type: 'error' });
      }
    } catch (error) {
      console.error('Error al actualizar canción:', error);
      setMessage({ text: 'Error de conexión. Inténtalo de nuevo.', type: 'error' });
    }
  };
  
  const SongDetail = () => {
    const { id } = useParams();
    const [song, setSong] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    
    useEffect(() => {
      const fetchSongDetail = async () => {
        try {
          const response = await fetch(`${apiBaseUrl}/songs/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          if (response.ok) {
            setSong(data);
          } else {
            setError(data.error || 'No se pudo cargar la canción.');
          }
        } catch (err) {
          setError('Error de conexión. Inténtalo de nuevo.');
        } finally {
          setLoading(false);
        }
      };

      if (token && id) {
        fetchSongDetail();
      }
    }, [id, token]);

    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-gray-500">Cargando detalles de la canción...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-500 mt-20">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
          <Link to="/" className="text-blue-500 hover:underline mt-4 block">Volver a la lista</Link>
        </div>
      );
    }
    
    if (!song) {
        return (
            <div className="text-center text-gray-500 mt-20">
                <h2 className="text-2xl font-bold mb-4">Canción no encontrada</h2>
                <p>La canción que buscas no existe.</p>
                <Link to="/" className="text-blue-500 hover:underline mt-4 block">Volver a la lista</Link>
            </div>
        );
    }

    return (
      <div className="flex flex-col gap-8 w-full max-w-4xl">
        <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Detalles de la Canción</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="font-bold text-lg text-gray-800">Título: <span className="font-normal">{song.title}</span></div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="font-bold text-lg text-gray-800">Artista: <span className="font-normal">{song.artist}</span></div>
            </div>
            {song.album && (
              <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="font-bold text-lg text-gray-800">Álbum: <span className="font-normal">{song.album}</span></div>
              </div>
            )}
            {song.genre && (
              <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="font-bold text-lg text-gray-800">Género: <span className="font-normal">{song.genre}</span></div>
              </div>
            )}
          </div>
          {song.lyrics && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Letra</h3>
              <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100 text-gray-700 whitespace-pre-wrap">
                <pre>{song.lyrics}</pre>
              </div>
            </div>
          )}
          {song.chords && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Acordes</h3>
              <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100 text-gray-700 whitespace-pre-wrap">
                <pre>{song.chords}</pre>
              </div>
            </div>
          )}
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Volver
          </button>
        </section>
      </div>
    );
  };
  
  const Home = () => (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Mi Lista de Canciones ({songs.length})</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          />
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          >
            <option value="">Todos los géneros</option>
            {uniqueGenres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </div>
        {songs.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aún no has agregado ninguna canción.</p>
        ) : (
          <ul className="space-y-4">
            {songs.map(song => (
              <li key={song.song_id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex-1">
                  <Link to={`/songs/${song.song_id}`} className="font-bold text-lg text-gray-800 hover:text-blue-600 transition-colors">{song.title}</Link>
                  <div className="text-sm text-gray-600">
                    {song.artist}{song.album && <span className="ml-2 text-gray-400">({song.album})</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
    </div>
  );

  const AddSong = () => (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Agregar Nueva Canción</h2>
        <form onSubmit={handleAddSong} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Título"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            required
          />
          <input
            type="text"
            placeholder="Artista"
            value={songArtist}
            onChange={(e) => setSongArtist(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            required
          />
          <input
            type="text"
            placeholder="Álbum (Opcional)"
            value={songAlbum}
            onChange={(e) => setSongAlbum(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          />
           <input
            type="text"
            placeholder="Género (Opcional)"
            value={songGenre}
            onChange={(e) => setSongGenre(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          />
          <textarea
            placeholder="Letra (Opcional)"
            value={songLyrics}
            onChange={(e) => setSongLyrics(e.target.value)}
            rows="5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition md:col-span-3"
          />
          <textarea
            placeholder="Acordes (Opcional)"
            value={songChords}
            onChange={(e) => setSongChords(e.target.value)}
            rows="5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition md:col-span-3"
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
    </div>
  );

  const EditSong = () => {
    const navigate = useNavigate();
    useEffect(() => {
      if (!songToEdit) navigate('/');
    }, [songToEdit, navigate]);

    return songToEdit ? (
      <div className="flex flex-col gap-8 w-full max-w-4xl">
        <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Editar Canción</h2>
          <form onSubmit={handleUpdateSong} className="space-y-4">
            <input
              type="text"
              placeholder="Título"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
            <input
              type="text"
              placeholder="Artista"
              value={editedArtist}
              onChange={(e) => setEditedArtist(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
            <input
              type="text"
              placeholder="Álbum"
              value={editedAlbum}
              onChange={(e) => setEditedAlbum(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <textarea
              placeholder="Letra"
              value={editedLyrics}
              onChange={(e) => setEditedLyrics(e.target.value)}
              rows="5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <textarea
              placeholder="Acordes"
              value={editedChords}
              onChange={(e) => setEditedChords(e.target.value)}
              rows="5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <div className="flex gap-4">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Guardar Cambios
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      </div>
    ) : null;
  };
  
  const NotFound = () => (
    <div className="text-center text-gray-500 mt-20">
      <h2 className="text-3xl font-bold mb-4">404 - Página no encontrada</h2>
      <p>La página que buscas no existe.</p>
      <Link to="/" className="text-blue-500 hover:underline mt-4 block">Volver a la página principal</Link>
    </div>
  );

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
      <BrowserRouter>
        <div className="flex flex-col gap-8 w-full max-w-4xl">
          <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800">MusiNotes</h1>
            <nav className="flex items-center gap-4">
              <Link to="/" className="text-gray-600 hover:text-blue-500 transition-colors font-medium">Lista</Link>
              <Link to="/add" className="text-gray-600 hover:text-blue-500 transition-colors font-medium">Añadir Canción</Link>
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Cerrar Sesión
              </button>
            </nav>
          </header>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add" element={<AddSong />} />
            <Route path="/edit/:id" element={<EditSong />} />
            <Route path="/songs/:id" element={<SongDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
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
