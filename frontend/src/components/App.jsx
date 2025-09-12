import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001'; // Make sure this matches your backend server URL

// Utility function to get JWT token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [songs, setSongs] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', artist: '', album: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [songToEdit, setSongToEdit] = useState(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedArtist, setEditedArtist] = useState('');
  const [editedAlbum, setEditedAlbum] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [songToDelete, setSongToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Function to handle fetching songs from the backend
  const fetchSongs = async (query = '') => {
    try {
      const token = getAuthToken();
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      let url = `${API_URL}/songs`;
      if (query) {
        url = `${API_URL}/songs/search?title=${encodeURIComponent(query)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        return;
      }

      const data = await response.json();
      setSongs(data);
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  useEffect(() => {
    // Check if user is logged in on component mount
    const token = getAuthToken();
    if (token) {
      setIsLoggedIn(true);
      fetchSongs();
    }
  }, []);

  // Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    // Dummy login logic for demonstration
    // This should be replaced with an actual API call
    console.log('Login attempt');
    const token = 'fake-jwt-token';
    localStorage.setItem('token', token);
    setIsLoggedIn(true);
    fetchSongs();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setSongs([]);
  };

  // Handle add song form submission
  const handleAddSong = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSong)
      });
      if (response.ok) {
        const addedSong = await response.json();
        setSongs([...songs, addedSong]);
        setShowAddModal(false);
        setNewSong({ title: '', artist: '', album: '' });
      } else {
        console.error('Failed to add song.');
      }
    } catch (error) {
      console.error('Error adding song:', error);
    }
  };

  // Handle edit song
  const handleEditClick = (song) => {
    setSongToEdit(song);
    setEditedTitle(song.title);
    setEditedArtist(song.artist);
    setEditedAlbum(song.album);
    setShowEditModal(true);
  };

  const handleUpdateSong = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/songs/${songToEdit.song_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editedTitle,
          artist: editedArtist,
          album: editedAlbum
        })
      });
      if (response.ok) {
        const updatedSong = await response.json();
        setSongs(songs.map(s => (s.song_id === updatedSong.song_id ? updatedSong : s)));
        setShowEditModal(false);
        setSongToEdit(null);
      } else {
        console.error('Failed to update song.');
      }
    } catch (error) {
      console.error('Error updating song:', error);
    }
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setSongToEdit(null);
  };

  // Handle delete song
  const handleDeleteClick = (song) => {
    setSongToDelete(song);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/songs/${songToDelete.song_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setSongs(songs.filter(s => s.song_id !== songToDelete.song_id));
        setShowDeleteModal(false);
        setSongToDelete(null);
      } else {
        console.error('Failed to delete song.');
      }
    } catch (error) {
      console.error('Error deleting song:', error);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSongToDelete(null);
  };

  // Handle search functionality
  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchSongs(query);
  };


  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <form onSubmit={handleLogin} className="p-8 bg-white rounded-xl shadow-lg w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-300"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Mis Canciones</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-300"
          >
            Logout
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-600 transition duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Agregar Canción
          </button>
        </div>
      </header>

      {/* Search Input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por título..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {songs.map(song => (
          <div key={song.song_id} className="bg-white p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{song.title}</h3>
            <p className="text-gray-600 mb-1">
              **Artista:** {song.artist}
            </p>
            <p className="text-gray-600 mb-4">
              **Álbum:** {song.album}
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => handleEditClick(song)}
                className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm transition duration-300 hover:bg-blue-600"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteClick(song)}
                className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm transition duration-300 hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Song Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Agregar Nueva Canción</h2>
            <form onSubmit={handleAddSong}>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Título"
                  value={newSong.title}
                  onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Artista"
                  value={newSong.artist}
                  onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Álbum"
                  value={newSong.album}
                  onChange={(e) => setNewSong({ ...newSong, album: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-300"
                >
                  Guardar Canción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Song Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Editar Canción</h2>
            <form onSubmit={handleUpdateSong}>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Título"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Artista"
                  value={editedArtist}
                  onChange={(e) => setEditedArtist(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Álbum"
                  value={editedAlbum}
                  onChange={(e) => setEditedAlbum(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm text-center">
            <h2 className="text-xl font-bold mb-4 text-gray-800">¿Estás seguro?</h2>
            <p className="mb-6 text-gray-600">
              Estás a punto de eliminar la canción **{songToDelete?.title}**. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={cancelDelete}
                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-300"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
