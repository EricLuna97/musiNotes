const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error al conectar a la base de datos', err.stack);
  } else {
    console.log('Conexión a la base de datos exitosa');
  }
});

// Middlewares de autenticación y autorización
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ error: 'Token no proporcionado. Acceso denegado.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado. Acceso denegado.' });
    }
    req.userId = user.userId;
    next();
  });
}

// Endpoint para el registro de usuarios
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id',
      [username, email, hashedPassword]
    );
    res.status(201).json({ user_id: result.rows[0].user_id, message: 'Usuario registrado exitosamente.' });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Endpoint para el inicio de sesión
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userResult = await pool.query('SELECT user_id, password_hash FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ user_id: user.user_id, token, message: 'Inicio de sesión exitoso' });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Endpoint protegido de prueba
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: `Bienvenido, usuario ${req.userId}! Esta es una ruta protegida.` });
});

// Endpoint para agregar una canción
app.post('/songs', authenticateToken, async (req, res) => {
  const { title, artist, album } = req.body;
  const userId = req.userId;

  if (!title || !artist) {
    return res.status(400).json({ error: 'El título y el artista son campos obligatorios.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO songs (title, artist, album, user_id) VALUES ($1, $2, $3, $4) RETURNING song_id',
      [title, artist, album, userId]
    );
    res.status(201).json({
      song_id: result.rows[0].song_id,
      message: 'Canción agregada exitosamente.'
    });
  } catch (error) {
    console.error('Error al agregar la canción:', error);
    res.status(500).json({ error: 'Error al agregar la canción.' });
  }
});

// Endpoint para obtener todas las canciones del usuario
app.get('/songs', authenticateToken, async (req, res) => {
  const userId = req.userId;

  try {
    const query = 'SELECT * FROM songs WHERE user_id = $1 ORDER BY title ASC';
    const values = [userId];
    const result = await pool.query(query, values);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener la lista de canciones:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
