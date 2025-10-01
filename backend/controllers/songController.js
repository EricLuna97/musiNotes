const pool = require('../config/database');
const logger = require('../config/logger');
const PDFDocument = require('pdfkit');

// Get a single song
const getSong = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a number
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid song ID' });
    }

    logger.info('Fetching single song', { songId: id, userId: req.user.id });

    const result = await pool.query(
      'SELECT song_id, title, artist, album, genre, lyrics, chords, created_at FROM songs WHERE song_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      logger.warn('Song not found', { songId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Song not found or access denied' });
    }

    logger.info('Song fetched successfully', { songId: id, userId: req.user.id });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Fetch single song error', {
      error: error.message,
      stack: error.stack,
      songId: req.params.id,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all songs for authenticated user with search and filter
const getSongs = async (req, res) => {
  try {
    logger.info('Fetching songs for user', { userId: req.user.id, query: req.query });

    const { search, genre, sort = 'created_at', order = 'DESC' } = req.query;

    let query = 'SELECT song_id, title, artist, album, genre, lyrics, chords, created_at FROM songs WHERE user_id = $1';
    let params = [req.user.id];
    let paramIndex = 2;

    // Add search filter
    if (search) {
      query += ` AND (title ILIKE $${paramIndex} OR artist ILIKE $${paramIndex} OR album ILIKE $${paramIndex} OR lyrics ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add genre filter
    if (genre) {
      query += ` AND genre ILIKE $${paramIndex}`;
      params.push(`%${genre}%`);
      paramIndex++;
    }

    // Add sorting
    const validSortFields = ['title', 'artist', 'album', 'genre', 'created_at'];
    const validOrders = ['ASC', 'DESC'];

    if (validSortFields.includes(sort) && validOrders.includes(order.toUpperCase())) {
      query += ` ORDER BY ${sort} ${order.toUpperCase()}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await pool.query(query, params);

    logger.info('Songs fetched successfully', {
      userId: req.user.id,
      count: result.rows.length,
      filters: { search, genre, sort, order }
    });

    res.json(result.rows);
  } catch (error) {
    logger.error('Fetch songs error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
};

// Create a new song
const createSong = async (req, res) => {
  try {
    const { title, artist, album, genre, lyrics, chords } = req.body;

    logger.info('Creating new song', {
      userId: req.user.id,
      title,
      artist
    });

    const result = await pool.query(
      'INSERT INTO songs (title, artist, album, genre, lyrics, chords, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title.trim(), artist.trim(), album?.trim() || null, genre?.trim() || null, lyrics?.trim() || null, chords?.trim() || null, req.user.id]
    );

    logger.info('Song created successfully', {
      songId: result.rows[0].song_id,
      userId: req.user.id
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Create song error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
};

// Update a song
const updateSong = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a number
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid song ID' });
    }

    const { title, artist, album, genre, lyrics, chords } = req.body;

    logger.info('Updating song', {
      songId: id,
      userId: req.user.id,
      updates: Object.keys(req.body)
    });

    const result = await pool.query(
      'UPDATE songs SET title = $1, artist = $2, album = $3, genre = $4, lyrics = $5, chords = $6 WHERE song_id = $7 AND user_id = $8 RETURNING *',
      [title?.trim(), artist?.trim(), album?.trim() || null, genre?.trim() || null, lyrics?.trim() || null, chords?.trim() || null, id, req.user.id]
    );

    if (result.rows.length === 0) {
      logger.warn('Song not found for update', { songId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Song not found or access denied' });
    }

    logger.info('Song updated successfully', { songId: id, userId: req.user.id });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Update song error', {
      error: error.message,
      stack: error.stack,
      songId: req.params.id,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete a song
const deleteSong = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a number
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid song ID' });
    }

    logger.info('Deleting song', { songId: id, userId: req.user.id });

    const result = await pool.query(
      'DELETE FROM songs WHERE song_id = $1 AND user_id = $2 RETURNING song_id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      logger.warn('Song not found for deletion', { songId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Song not found or access denied' });
    }

    logger.info('Song deleted successfully', { songId: id, userId: req.user.id });
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    logger.error('Delete song error', {
      error: error.message,
      stack: error.stack,
      songId: req.params.id,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
};

// Download song as PDF
const downloadSongPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a number
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid song ID' });
    }

    logger.info('Generating PDF for song', { songId: id, userId: req.user.id });

    const result = await pool.query(
      'SELECT * FROM songs WHERE song_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found or access denied' });
    }

    const song = result.rows[0];

    // Create PDF
    const doc = new PDFDocument();
    const filename = `${song.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(24).text(song.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(`By ${song.artist}`, { align: 'center' });
    if (song.album) {
      doc.fontSize(14).text(`Album: ${song.album}`, { align: 'center' });
    }
    if (song.genre) {
      doc.fontSize(14).text(`Genre: ${song.genre}`, { align: 'center' });
    }
    doc.moveDown(2);

    if (song.lyrics) {
      doc.fontSize(16).text('Lyrics:', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(song.lyrics, {
        align: 'left',
        lineGap: 5
      });
      doc.moveDown();
    }

    if (song.chords) {
      doc.fontSize(16).text('Chords:', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(song.chords, {
        align: 'left',
        lineGap: 5
      });
      doc.moveDown();
    }

    doc.end();

    logger.info('PDF generated successfully', { songId: id, userId: req.user.id });
  } catch (error) {
    logger.error('PDF generation error', {
      error: error.message,
      stack: error.stack,
      songId: req.params.id,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getSong,
  getSongs,
  createSong,
  updateSong,
  deleteSong,
  downloadSongPDF
};