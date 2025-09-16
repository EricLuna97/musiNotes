const fs = require('fs');
const path = require('path');
const pool = require('./db');

const initDb = async () => {
  try {
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