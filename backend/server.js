const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

// Se requiere instalar jsonwebtoken: npm install jsonwebtoken
// Esto es para la autenticación
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-that-should-be-more-secure';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middleware para autenticar el token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).send('Token no proporcionado.');
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).send('Token no válido o expirado.');
    }
    req.user = user;
    next();
  });
};

// Endpoint de login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password_hash)) {
      const accessToken = jwt.sign({ user_id: user.user_id }, SECRET_KEY, { expiresIn: '1h' });
      res.json({ token: accessToken, user_id: user.user_id });
    } else {
      res.status(401).send('Credenciales inválidas.');
    }
  } catch (error) {
    console.error('Error de login:', error);
    res.status(500).send('Error del servidor');
  }
});

// Endpoint para obtener todas las canciones del usuario
app.get('/songs', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM songs WHERE user_id = $1 ORDER BY created_at DESC', [req.user.user_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener canciones:', error);
    res.status(500).send('Error del servidor');
  }
});

// Endpoint para agregar una nueva canción
app.post('/songs', authenticateToken, async (req, res) => {
  const { title, artist, album } = req.body;
  try {
    const newSong = await pool.query(
      "INSERT INTO songs (title, artist, album, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [title, artist, album, req.user.user_id]
    );
    res.status(201).json(newSong.rows[0]);
  } catch (error) {
    console.error('Error al agregar canción:', error);
    res.status(500).send('Error del servidor');
  }
});

// Endpoint para actualizar una canción
app.put('/songs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, artist, album } = req.body;
  
  try {
    // Verificar que la canción pertenezca al usuario autenticado
    const checkSong = await pool.query('SELECT user_id FROM songs WHERE song_id = $1', [id]);
    if (checkSong.rows.length === 0) {
      return res.status(404).send('Canción no encontrada.');
    }
    if (checkSong.rows[0].user_id !== req.user.user_id) {
      return res.status(403).send('No tienes permiso para editar esta canción.');
    }

    // Actualizar la canción
    const result = await pool.query(
      "UPDATE songs SET title = $1, artist = $2, album = $3 WHERE song_id = $4 RETURNING *",
      [title, artist, album, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Canción no encontrada.');
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar canción:', error);
    res.status(500).send('Error del servidor');
  }
});

// Endpoint para eliminar una canción
app.delete('/songs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verificar que la canción pertenezca al usuario autenticado
    const checkSong = await pool.query('SELECT user_id FROM songs WHERE song_id = $1', [id]);
    if (checkSong.rows.length === 0) {
      return res.status(404).send('Canción no encontrada.');
    }
    if (checkSong.rows[0].user_id !== req.user.user_id) {
      return res.status(403).send('No tienes permiso para eliminar esta canción.');
    }

    // Eliminar la canción
    const result = await pool.query("DELETE FROM songs WHERE song_id = $1", [id]);

    // Verificar si se eliminó alguna fila
    if (result.rowCount === 0) {
      return res.status(404).send('Canción no encontrada.');
    }

    res.status(204).send(); // 204 No Content para indicar eliminación exitosa
  } catch (error) {
    console.error('Error al eliminar canción:', error);
    res.status(500).send('Error del servidor');
  }
});

// Nuevo endpoint para buscar canciones por título
app.get('/songs/search', authenticateToken, async (req, res) => {
  const { title } = req.query;

  try {
    // Si no se proporciona un título, devolver todas las canciones del usuario
    if (!title) {
      const allSongs = await pool.query('SELECT * FROM songs WHERE user_id = $1 ORDER BY created_at DESC', [req.user.user_id]);
      return res.json(allSongs.rows);
    }

    // Usar LIKE con comodines para buscar títulos que contengan la cadena de búsqueda
    const searchQuery = `%${title}%`;
    const result = await pool.query(
      "SELECT * FROM songs WHERE user_id = $1 AND title ILIKE $2 ORDER BY created_at DESC",
      [req.user.user_id, searchQuery]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al buscar canciones:', error);
    res.status(500).send('Error del servidor');
  }
});

// Endpoint de registro
app.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const newUser = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
      [username, email, password_hash]
    );
    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error del servidor");
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
