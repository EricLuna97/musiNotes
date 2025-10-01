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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="card p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-primary">MusiNotes</h1>
              <p className="text-neutral-light mt-2">User: {user.username}</p>
            </div>
            <div className="flex gap-4">
              <Link
                to="/songs/new"
                className="btn-primary"
              >
                + New Song
              </Link>
              <Link
                to="/dashboard"
                className="bg-neutral-dark bg-opacity-40 text-neutral-light px-6 py-3 rounded-xl font-medium hover:bg-opacity-60 transition-all duration-200"
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="card p-8 mb-8">
          <h2 className="text-2xl font-semibold text-techno-light mb-6">Search and Filter Songs</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <input
              type="text"
              placeholder="Search by title, artist, album or lyrics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Filter by genre"
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="input-field"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
            >
              <option value="created_at">Date</option>
              <option value="title">Title</option>
              <option value="artist">Artist</option>
              <option value="genre">Genre</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="input-field"
            >
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
          </div>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-semibold text-techno-light mb-6">My Songs</h2>
          {songs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-light mb-6 text-lg">You don't have any songs yet. Add the first one!</p>
              <Link
                to="/songs/new"
                className="btn-primary"
              >
                Create First Song
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {songs.map((song) => (
                <div key={song.song_id} className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-techno-light mb-2">{song.title}</h3>
                      <p className="text-neutral-light">{song.artist} {song.album && `- ${song.album}`}</p>
                      {song.genre && <p className="text-sm text-neutral-dark mt-1">{song.genre}</p>}
                    </div>
                    <div className="flex gap-3">
                      <Link
                        to={`/songs/${song.song_id}/edit`}
                        className="bg-secondary text-techno-light px-4 py-2 rounded-xl font-medium hover:bg-opacity-80 transition-all duration-200"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDownloadPDF(song.song_id, song.title)}
                        className="bg-primary text-techno-light px-4 py-2 rounded-xl font-medium hover:bg-primary-dark transition-all duration-200"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleDeleteSong(song.song_id)}
                        className="bg-error text-techno-light px-4 py-2 rounded-xl font-medium hover:bg-opacity-80 transition-all duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {song.lyrics && (
                    <div className="mt-6">
                      <h4 className="text-lg font-medium text-techno-light mb-3">Lyrics:</h4>
                      <pre className="text-neutral-light whitespace-pre-wrap leading-relaxed">{song.lyrics}</pre>
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