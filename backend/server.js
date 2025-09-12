const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;
const SECRET_KEY = 'your-secret-key'; // Replace with a strong, random secret key

app.use(cors());
app.use(bodyParser.json());

// Dummy database for demonstration
let songs = [
  { song_id: 1, title: 'Shape of You', artist: 'Ed Sheeran', album: '÷ (Divide)', genre: 'Pop' },
  { song_id: 2, title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', genre: 'Pop' },
  { song_id: 3, title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', genre: 'Rock' },
  { song_id: 4, title: 'Hotel California', artist: 'Eagles', album: 'Hotel California', genre: 'Rock' },
  { song_id: 5, title: 'Despacito', artist: 'Luis Fonsi', album: 'Vida', genre: 'Latin Pop' },
  { song_id: 6, title: 'Billie Jean', artist: 'Michael Jackson', album: 'Thriller', genre: 'Pop' },
  { song_id: 7, title: 'Smells Like Teen Spirit', artist: 'Nirvana', album: 'Nevermind', genre: 'Grunge' },
];

let nextSongId = songs.length + 1;

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Login endpoint (for demonstration purposes)
app.post('/login', (req, res) => {
  // In a real application, you would validate user credentials here
  const user = { username: 'user123' };
  const token = jwt.sign(user, SECRET_KEY);
  res.json({ token });
});

// GET all songs or search songs by title and/or genre
app.get('/songs/search', authenticateToken, (req, res) => {
  const { title, genre } = req.query;
  let filteredSongs = songs;

  // Filter by title if the query parameter is present
  if (title) {
    filteredSongs = filteredSongs.filter(song =>
      song.title.toLowerCase().includes(title.toLowerCase())
    );
  }

  // Filter by genre if the query parameter is present
  if (genre) {
    filteredSongs = filteredSongs.filter(song =>
      song.genre.toLowerCase().includes(genre.toLowerCase())
    );
  }

  res.json(filteredSongs);
});

// GET all songs (fallback for old frontend versions)
app.get('/songs', authenticateToken, (req, res) => {
  res.json(songs);
});

// POST a new song
app.post('/songs', authenticateToken, (req, res) => {
  const newSong = {
    song_id: nextSongId++,
    title: req.body.title,
    artist: req.body.artist,
    album: req.body.album,
    genre: req.body.genre // Include the new genre property
  };
  songs.push(newSong);
  res.status(201).json(newSong);
});

// PUT to update an existing song
app.put('/songs/:id', authenticateToken, (req, res) => {
  const songId = parseInt(req.params.id);
  const songIndex = songs.findIndex(s => s.song_id === songId);

  if (songIndex === -1) {
    return res.status(404).send('Song not found.');
  }

  const updatedSong = {
    song_id: songId,
    title: req.body.title,
    artist: req.body.artist,
    album: req.body.album,
    genre: req.body.genre // Include the new genre property
  };

  songs[songIndex] = updatedSong;
  res.json(updatedSong);
});

// DELETE a song
app.delete('/songs/:id', authenticateToken, (req, res) => {
  const songId = parseInt(req.params.id);
  const initialLength = songs.length;
  songs = songs.filter(s => s.song_id !== songId);

  if (songs.length === initialLength) {
    return res.status(404).send('Song not found.');
  }

  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
