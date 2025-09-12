const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'musinotes.db');

// Verifica si el directorio 'backend' existe
if (!fs.existsSync(path.dirname(dbPath))) {
  console.error("Error: El directorio 'backend' no existe.");
  process.exit(1);
}

// Conexión a la base de datos (se crea si no existe)
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    // Si hay un error, probablemente sea de permisos
    console.error(`Error al conectar con la base de datos: ${err.message}`);
    console.error("Asegúrate de ejecutar el terminal como administrador y de que la ruta sea correcta.");
    process.exit(1);
  } else {
    console.log('Conectado a la base de datos.');

    // Crea la tabla 'songs' si no existe
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS songs (
        song_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT,
        genre TEXT,
        lyrics TEXT,
        chords TEXT
      );
    `;

    db.run(createTableSql, (err) => {
      if (err) {
        console.error(`Error al crear la tabla 'songs': ${err.message}`);
        db.close();
        return;
      }
      console.log("Tabla 'songs' verificada/creada.");

      // Ahora, añade las nuevas columnas si no existen
      const addColumnsSql = `
        PRAGMA table_info(songs);
      `;

      db.all(addColumnsSql, (err, rows) => {
        if (err) {
          console.error(`Error al leer el esquema de la tabla: ${err.message}`);
          db.close();
          return;
        }

        const hasLyrics = rows.some(row => row.name === 'lyrics');
        const hasChords = rows.some(row => row.name === 'chords');

        if (hasLyrics && hasChords) {
          console.log('Las columnas "lyrics" y "chords" ya existen. No se necesita actualización.');
          db.close();
        } else {
          const updateSql = `
            BEGIN TRANSACTION;
            ${!hasLyrics ? 'ALTER TABLE songs ADD COLUMN lyrics TEXT;' : ''}
            ${!hasChords ? 'ALTER TABLE songs ADD COLUMN chords TEXT;' : ''}
            COMMIT;
          `;
          
          if (hasLyrics && hasChords) {
            console.log('Las columnas "lyrics" y "chords" ya existen.');
          } else {
            db.run(updateSql, (err) => {
              if (err) {
                console.error('Error al actualizar la tabla:', err.message);
              } else {
                console.log('Tabla de canciones actualizada. Columnas "lyrics" y "chords" añadidas.');
              }
              db.close((closeErr) => {
                if (closeErr) {
                  console.error(closeErr.message);
                }
                console.log('Conexión a la base de datos cerrada.');
              });
            });
          }
        }
      });
    });
  }
});
