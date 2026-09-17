import { pool } from '../config/db.js';
import { defaultCmsSettings } from '../config/defaultCms.js';

function parseSetting(key, value) {
  try {
    return value ? JSON.parse(value) : defaultCmsSettings[key];
  } catch {
    return defaultCmsSettings[key];
  }
}

export async function getCmsSettings(_req, res) {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM cms_settings');
  const settings = { ...defaultCmsSettings };

  rows.forEach(row => {
    settings[row.setting_key] = parseSetting(row.setting_key, row.setting_value);
  });

  res.json(settings);
}

export async function getCmsSection(req, res) {
  const key = req.params.key;
  if (!defaultCmsSettings[key]) {
    return res.status(404).json({ message: 'CMS section not found' });
  }

  const [rows] = await pool.query('SELECT setting_value FROM cms_settings WHERE setting_key = ?', [key]);
  res.json(rows[0] ? parseSetting(key, rows[0].setting_value) : defaultCmsSettings[key]);
}

export async function updateCmsSection(req, res) {
  const key = req.params.key;
  if (!defaultCmsSettings[key]) {
    return res.status(404).json({ message: 'CMS section not found' });
  }

  await pool.query(
    `INSERT INTO cms_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [key, JSON.stringify(req.body || {})]
  );

  await pool.query(
    'INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, 'update_cms', 'cms_settings', null, key]
  );

  res.json({ message: 'Settings saved', key, value: req.body });
}

export async function uploadCmsMedia(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Media file is required' });
  }

  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({
    url,
    mimeType: req.file.mimetype,
    filename: req.file.filename
  });
}
