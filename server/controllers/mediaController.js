import { pool } from '../config/db.js';

// Auto-create media_gallery table if missing
async function ensureMediaTableExists() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS media_gallery (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('photo', 'video') NOT NULL DEFAULT 'photo',
        url VARCHAR(500) NOT NULL,
        caption TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } catch (err) {
    console.error('Error initializing media_gallery table:', err);
  }
}

ensureMediaTableExists();

export async function listMedia(req, res) {
  try {
    const { type, mine } = req.query;
    const params = [];
    const where = [];

    if (type && ['photo', 'video'].includes(type)) {
      where.push('m.type = ?');
      params.push(type);
    }

    if (mine === 'true' && req.user) {
      where.push('m.user_id = ?');
      params.push(req.user.id);
    }

    const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT m.*, u.name AS user_name, u.role AS user_role, u.profile_image_url AS user_profile_image
       FROM media_gallery m
       JOIN users u ON u.id = m.user_id
       ${sqlWhere}
       ORDER BY m.created_at DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch media gallery' });
  }
}

export async function createMedia(req, res) {
  try {
    const { type = 'photo', caption = '', externalUrl = '' } = req.body;
    let url = externalUrl;

    if (req.file) {
      url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    if (!url) {
      return res.status(400).json({ message: 'Media file or URL is required' });
    }

    const mediaType = ['photo', 'video'].includes(type) ? type : (req.file?.mimetype.startsWith('video/') ? 'video' : 'photo');

    const [result] = await pool.query(
      'INSERT INTO media_gallery (user_id, type, url, caption) VALUES (?, ?, ?, ?)',
      [req.user.id, mediaType, url, caption]
    );

    const [rows] = await pool.query(
      `SELECT m.*, u.name AS user_name, u.role AS user_role, u.profile_image_url AS user_profile_image
       FROM media_gallery m
       JOIN users u ON u.id = m.user_id
       WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ message: 'Media uploaded successfully', media: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Could not upload media' });
  }
}

export async function deleteMedia(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM media_gallery WHERE id = ?', [req.params.id]);
    const item = rows[0];

    if (!item) {
      return res.status(404).json({ message: 'Media item not found' });
    }

    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to delete this media item' });
    }

    await pool.query('DELETE FROM media_gallery WHERE id = ?', [req.params.id]);
    res.json({ message: 'Media deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete media' });
  }
}
