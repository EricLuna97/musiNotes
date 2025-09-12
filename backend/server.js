const express = require('express');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// Clave secreta para JWT
const jwtSecret = 'tu_clave_secreta_aqui';

// Configuración de la conexión a la base de datos
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'music_notes'
});

db.connect(err => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conexión a la base de datos MySQL exitosa.');
});

// Middleware para verificar el token JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido' });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Autenticación necesaria' });
  }
};

// Endpoint de login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT id, email, password FROM users WHERE email = ?';
  db.query(sql, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error del servidor' });
    }
    if (results.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    const user = results[0];
    if (password === user.password) {
      const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: '1h' });
      res.json({ token, id: user.id });
    } else {
      res.status(401).json({ error: 'Contraseña incorrecta' });
    }
  });
});

// Endpoint para obtener canciones
app.get('/songs/search', authenticateJWT, (req, res) => {
  const { title, genre } = req.query;
  const userId = req.user.id;
  let sql = 'SELECT * FROM songs WHERE user_id = ?';
  const params = [userId];

  if (title) {
    sql += ' AND title LIKE ?';
    params.push(`%${title}%`);
  }
  
  if (genre) {
    sql += ' AND genre = ?';
    params.push(genre);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error del servidor' });
    }
    res.json(results);
  });
});

// Endpoint para agregar una nueva canción
app.post('/songs', authenticateJWT, (req, res) => {
  const { title, artist, album, genre } = req.body;
  const userId = req.user.id;
  const sql = 'INSERT INTO songs (title, artist, album, genre, user_id) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [title, artist, album, genre, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error del servidor' });
    }
    res.status(201).json({ message: 'Canción agregada con éxito', id: result.insertId });
  });
});

// Endpoint para obtener una canción por su ID
app.get('/songs/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const sql = 'SELECT * FROM songs WHERE song_id = ? AND user_id = ?';
  db.query(sql, [id, userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error del servidor' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Canción no encontrada o no tienes permiso para verla' });
    }
    res.json(results[0]);
  });
});

// Endpoint para actualizar una canción
app.put('/songs/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { title, artist, album } = req.body;
  const userId = req.user.id;

  const sql = 'UPDATE songs SET title = ?, artist = ?, album = ? WHERE song_id = ? AND user_id = ?';
  db.query(sql, [title, artist, album, id, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error del servidor' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Canción no encontrada o no tienes permiso para editarla' });
    }
    res.json({ message: 'Canción actualizada con éxito' });
  });
});

// NUEVO: Endpoint para eliminar una canción (Paso 50 y 51)
app.delete('/songs/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const sql = 'DELETE FROM songs WHERE song_id = ? AND user_id = ?';
  db.query(sql, [id, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error del servidor' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Canción no encontrada o no tienes permiso para eliminarla' });
    }
    res.json({ message: 'Canción eliminada con éxito' });
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
