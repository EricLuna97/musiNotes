import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// API base URL - use environment variable or fallback
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const SongsList = ({ token, user, setError, setSuccess }) => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

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

  const fetchSongs = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterGenre) params.append('genre', filterGenre);
      if (sortBy) params.append('sort', sortBy);
      if (sortOrder) params.append('order', sortOrder);

      const queryString = params.toString();
      const endpoint = queryString ? `/songs?${queryString}` : '/songs';

      const data = await apiCall(endpoint);
      setSongs(data);
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [searchTerm, filterGenre, sortBy, sortOrder]);

  const handleDeleteSong = async (id) => {
    if (!confirm('Are you sure you want to delete this song?')) return;

    setError('');
    setSuccess('');

    try {
      await apiCall(`/songs/${id}`, { method: 'DELETE' });
      setSuccess('Song deleted successfully!');
      fetchSongs();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDownloadPDF = async (songId, songTitle) => {
    try {
      const response = await fetch(`${API_BASE}/songs/${songId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${songTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to download PDF');
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-green-400">MusiNotes</h1>
              <p className="text-gray-400">Usuario: {user.username}</p>
            </div>
            <div className="flex gap-4">
              <Link
                to="/songs/new"
                className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700"
              >
                + New Song
              </Link>
              <Link
                to="/dashboard"
                className="bg-gray-600 text-white px-4 py-2 rounded-xl hover:bg-gray-700"
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Search and Filter Songs</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Search by title, artist, album or lyrics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="text"
              placeholder="Filter by genre"
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="created_at">Date</option>
              <option value="title">Title</option>
              <option value="artist">Artist</option>
              <option value="genre">Genre</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="p-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold text-white mb-4">My Songs</h2>
          {songs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">You don't have any songs yet. Add the first one!</p>
              <Link
                to="/songs/new"
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700"
              >
                Create First Song
              </Link>
            </div>
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
                      <Link
                        to={`/songs/${song.song_id}/edit`}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDownloadPDF(song.song_id, song.title)}
                        className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleDeleteSong(song.song_id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {song.lyrics && (
                    <div className="mt-4">
                      <h4 className="text-lg font-medium text-gray-200 mb-2">Lyrics:</h4>
                      <pre className="text-gray-300 whitespace-pre-wrap">{song.lyrics}</pre>
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

export default SongsList;