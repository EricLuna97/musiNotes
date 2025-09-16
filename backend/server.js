const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet'); // 🔐 Seguridad en cabeceras
const rateLimit = require('express-rate-limit'); // 🔐 Límite de requests
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(helmet()); // Protege cabeceras

// Rate limiter para evitar ataques de fuerza bruta en login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: { error: 'Too many login attempts, please try again later' }
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// API Routes

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validación básica de contraseña
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// User Login
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // 🔐 Ahora el token expira en 1 hora
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all songs for authenticated user
app.get('/api/songs', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM songs WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new song
app.post('/api/songs', authenticateToken, async (req, res) => {
  try {
    const { title, artist, album, genre, lyrics, chords } = req.body;
    const result = await pool.query(
      'INSERT INTO songs (title, artist, album, genre, lyrics, chords, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, artist, album, genre, lyrics, chords, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a song
app.put('/api/songs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, album, genre, lyrics, chords } = req.body;
    const result = await pool.query(
      'UPDATE songs SET title = $1, artist = $2, album = $3, genre = $4, lyrics = $5, chords = $6 WHERE song_id = $7 AND user_id = $8 RETURNING *',
      [title, artist, album, genre, lyrics, chords, id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Song not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a song
app.delete('/api/songs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM songs WHERE song_id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Song not found' });
    res.json({ message: 'Song deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Servir los archivos estáticos de la aplicación de React
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendBuildPath));

// Para aplicaciones de una sola página, redirigir todas las rutas a index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor de MusiNotes corriendo en http://localhost:${port}`);
  console.log("Visita esta URL en tu navegador para ver la aplicación.");
});
