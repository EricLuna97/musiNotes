const fs = require('fs');
const path = require('path');
const pool = require('./config/database');

const initDb = async () => {
  try {
    // Drop existing tables
    await pool.query('DROP TABLE IF EXISTS songs CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');

    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schema);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    pool.end();
  }
};

initDb();