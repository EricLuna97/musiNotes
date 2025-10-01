import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import LyricsEditor from '../components/LyricsEditor';
import SongPreview from '../components/SongPreview';
import { parseLyricsWithChords } from '../utils/parseLyrics';

// API base URL - use environment variable or fallback
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const SongForm = ({ token, user, error, success, setError, setSuccess }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [songForm, setSongForm] = useState({
    title: '', artist: '', album: '', genre: '', lyrics: '', chords: ''
  });
  const [editingSong, setEditingSong] = useState(null);

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

  // Load song data if editing
  useEffect(() => {
    if (id && id !== 'new') {
      fetchSong();
    }
  }, [id]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, setSuccess]);

  const fetchSong = async () => {
    try {
      const data = await apiCall(`/songs/${id}`);
      setEditingSong(data);
      setSongForm({
        title: data.title,
        artist: data.artist,
        album: data.album || '',
        genre: data.genre || '',
        lyrics: data.lyrics || '',
        chords: data.chords || '',
      });
    } catch (error) {
      console.error('Error fetching song:', error);
      setError('Error loading song');
    }
  };

  const handleSongSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Basic frontend validation
    if (!songForm.title.trim() || !songForm.artist.trim()) {
      setError('Title and artist are required');
      setLoading(false);
      return;
    }

    if (songForm.title.length > 255 || songForm.artist.length > 255) {
      setError('Title and artist must be less than 255 characters');
      setLoading(false);
      return;
    }

    if (songForm.lyrics && songForm.lyrics.length > 10000) {
      setError('Lyrics must be less than 10,000 characters');
      setLoading(false);
      return;
    }


    try {
      if (editingSong) {
        await apiCall(`/songs/${editingSong.song_id}`, {
          method: 'PUT',
          body: JSON.stringify(songForm),
        });
        setSuccess('Song updated successfully!');
      } else {
        await apiCall('/songs', {
          method: 'POST',
          body: JSON.stringify(songForm),
        });
        setSuccess('Song created successfully!');
      }
      navigate('/songs');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen">
      <Header user={user} handleLogout={() => {}} />
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="card p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-dark">{editingSong ? 'Edit Song' : 'Create New Song'}</h1>
                <p className="text-neutral-light mt-1">Add your musical creation</p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-neutral-dark bg-opacity-40 text-neutral-light px-6 py-3 rounded-xl font-medium hover:bg-opacity-60 transition-all duration-200"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

        <div className="card p-8">
          {error && (
            <div className="bg-error bg-opacity-20 border border-error border-opacity-30 text-error p-4 rounded-xl text-sm font-medium mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-success bg-opacity-20 border border-success border-opacity-30 text-success p-4 rounded-xl text-sm font-medium mb-6">
              {success}
            </div>
          )}
          <h2 className="text-2xl font-semibold text-techno-light mb-8">
            {editingSong ? 'Edit Song' : 'Create New Song'}
          </h2>
          <form onSubmit={handleSongSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input
                type="text"
                placeholder="Title"
                value={songForm.title}
                onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                className="input-field"
                required
                minLength="1"
                maxLength="255"
              />
              <input
                type="text"
                placeholder="Artist"
                value={songForm.artist}
                onChange={(e) => setSongForm({ ...songForm, artist: e.target.value })}
                className="input-field"
                required
                minLength="1"
                maxLength="255"
              />
              <input
                type="text"
                placeholder="Album"
                value={songForm.album}
                onChange={(e) => setSongForm({ ...songForm, album: e.target.value })}
                className="input-field"
                maxLength="255"
              />
              <input
                type="text"
                placeholder="Genre"
                value={songForm.genre}
                onChange={(e) => setSongForm({ ...songForm, genre: e.target.value })}
                className="input-field"
                maxLength="255"
              />
            </div>
            {/* Lyrics Editor */}
            <LyricsEditor
              lyrics={songForm.lyrics}
              chords={songForm.chords}
              onLyricsChange={(lyrics) => setSongForm({ ...songForm, lyrics })}
              onChordsChange={(chords) => setSongForm({ ...songForm, chords })}
            />

            {/* Song Preview */}
            <div className="mt-6">
              <SongPreview
                title={songForm.title}
                artist={songForm.artist}
                album={songForm.album}
                genre={songForm.genre}
                lyrics={songForm.lyrics}
                chords={songForm.chords}
              />
            </div>
            <div className="flex gap-4 flex-wrap">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (editingSong ? 'Update' : 'Save')}
              </button>
              {editingSong && (
                <>
                  <button
                    type="button"
                    onClick={() => window.open(`${API_BASE}/songs/${editingSong.song_id}/pdf`, '_blank')}
                    className="bg-secondary text-techno-light py-3 px-6 rounded-xl font-medium hover:bg-opacity-80 transition-all duration-200"
                  >
                    📄 Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseLyricsWithChords(songForm.lyrics);
                      const exportText = parsed.map(line => `${line.chordsLine}\n${line.lyricsLine}`).join("\n");
                      const content = `${songForm.title}\nBy ${songForm.artist}\n\n${exportText}`;
                      const blob = new Blob([content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${songForm.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="bg-primary text-techno-light py-3 px-6 rounded-xl font-medium hover:bg-primary-dark transition-all duration-200"
                  >
                    📝 Export TXT
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => navigate('/songs')}
                className="bg-neutral-dark bg-opacity-40 text-neutral-light py-3 px-6 rounded-xl font-medium hover:bg-opacity-60 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
};

export default SongForm;