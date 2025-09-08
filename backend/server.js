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

// --- NUEVO MIDDLEWARE DE AUTENTICACIÓN ---
// Esta función se ejecuta antes de cualquier ruta protegida
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // El token se envía en el formato "Bearer TOKEN"
  const token = authHeader && authHeader.split(' ')[1];

  // Si no hay token, el usuario no está autorizado
  if (token == null) {
    return res.status(401).json({ error: 'Token no proporcionado. Acceso denegado.' });
  }

  // Verifica el token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    // Si el token no es válido, no está autorizado
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado. Acceso denegado.' });
    }
    // Si el token es válido, se guarda el usuario en la solicitud
    req.userId = user.userId;
    next(); // Pasa al siguiente middleware o a la ruta principal
  });
}

// User registration endpoint
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'Usuario registrado exitosamente.' });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Crear un token de sesión
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ id: user.id, token, message: 'Inicio de sesión exitoso' });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// --- NUEVO ENDPOINT PROTEGIDO ---
// Usa el middleware 'authenticateToken' para proteger esta ruta
app.get('/protected', authenticateToken, (req, res) => {
  // Si llegas a este punto, significa que el token es válido
  res.json({ message: `Bienvenido, usuario ${req.userId}! Esta es una ruta protegida. `});
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});