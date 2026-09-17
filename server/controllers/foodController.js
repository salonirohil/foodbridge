import { pool } from '../config/db.js';

async function expireOldAvailableFoods() {
  await pool.query(
    "UPDATE foods SET status = 'expired' WHERE status = 'available' AND expiry_time <= NOW()"
  );
}

export async function listFoods(req, res) {
  await expireOldAvailableFoods();

  const [rows] = await pool.query(
    `SELECT f.*, u.name AS restaurant_name, u.phone AS restaurant_phone
     FROM foods f
     JOIN users u ON u.id = f.restaurant_id
     WHERE f.status = 'available' AND f.expiry_time > NOW()
     ORDER BY f.created_at DESC`
  );
  res.json(rows);
}

export async function createFood(req, res) {
  const { name, quantityKg, expiryTime, pickupTime, address, description, vegNonVeg, specialInstructions } = req.body;

  if (!name || !quantityKg || !expiryTime || !pickupTime || !address) {
    return res.status(400).json({ message: 'Food name, quantity, expiry, pickup time, and address are required' });
  }

  if (new Date(expiryTime) <= new Date()) {
    return res.status(400).json({ message: 'Expiry time must be in the future' });
  }

  const imageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;

  const [result] = await pool.query(
    `INSERT INTO foods (restaurant_id, name, quantity_kg, expiry_time, pickup_time, address, description, image_url, veg_non_veg, special_instructions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, name, quantityKg, expiryTime, pickupTime, address, description || null, imageUrl || null, vegNonVeg || 'veg', specialInstructions || null]
  );

  const [rows] = await pool.query('SELECT * FROM foods WHERE id = ?', [result.insertId]);
  req.app.get('io').emit('food:created', rows[0]);
  req.app.get('io').emit('food:changed');
  res.status(201).json(rows[0]);
}

export async function updateFood(req, res) {
  const { name, quantityKg, expiryTime, pickupTime, address, description, vegNonVeg, specialInstructions } = req.body;

  if (!name || !quantityKg || !expiryTime || !pickupTime || !address) {
    return res.status(400).json({ message: 'Food name, quantity, expiry, pickup time, and address are required' });
  }

  if (new Date(expiryTime) <= new Date()) {
    return res.status(400).json({ message: 'Expiry time must be in the future' });
  }

  const [existingRows] = await pool.query(
    "SELECT * FROM foods WHERE id = ? AND restaurant_id = ? AND status = 'available'",
    [req.params.id, req.user.id]
  );

  const existingFood = existingRows[0];
  if (!existingFood) {
    return res.status(404).json({ message: 'Only available food posts can be updated' });
  }

  const imageUrl = req.file
    ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    : existingFood.image_url;

  await pool.query(
    `UPDATE foods
     SET name = ?, quantity_kg = ?, expiry_time = ?, pickup_time = ?, address = ?, description = ?, image_url = ?, veg_non_veg = ?, special_instructions = ?
     WHERE id = ? AND restaurant_id = ? AND status = 'available'`,
    [name, quantityKg, expiryTime, pickupTime, address, description || null, imageUrl || null, vegNonVeg || 'veg', specialInstructions || null, req.params.id, req.user.id]
  );

  const [rows] = await pool.query('SELECT * FROM foods WHERE id = ?', [req.params.id]);
  req.app.get('io').emit('food:updated', rows[0]);
  req.app.get('io').emit('food:changed');
  res.json(rows[0]);
}

export async function deleteFood(req, res) {
  const [result] = await pool.query(
    "DELETE FROM foods WHERE id = ? AND restaurant_id = ?",
    [req.params.id, req.user.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ message: 'Food post not found' });
  }

  req.app.get('io').emit('food:deleted', { id: Number(req.params.id) });
  req.app.get('io').emit('food:changed');
  res.json({ message: 'Food post deleted' });
}

export async function updateFoodStatus(req, res) {
  const { status } = req.body;
  const allowed = ['available', 'pending_approval', 'claimed', 'collected', 'expired', 'cancelled'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  if (status === 'available') {
    const [rows] = await pool.query(
      'SELECT expiry_time FROM foods WHERE id = ? AND restaurant_id = ?',
      [req.params.id, req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Food post not found' });
    }

    if (new Date(rows[0].expiry_time) <= new Date()) {
      return res.status(400).json({ message: 'Expired food cannot be marked available' });
    }
  }

  const [result] = await pool.query(
    'UPDATE foods SET status = ? WHERE id = ? AND restaurant_id = ?',
    [status, req.params.id, req.user.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ message: 'Food post not found' });
  }

  req.app.get('io').emit('food:updated', { id: Number(req.params.id), status });
  req.app.get('io').emit('food:changed');
  res.json({ message: 'Food status updated' });
}

export async function restaurantDashboard(req, res) {
  await expireOldAvailableFoods();

  const [summaryRows] = await pool.query(
    `SELECT
      COUNT(*) AS totalPosts,
      COALESCE(SUM(quantity_kg), 0) AS totalFoodKg,
      SUM(status = 'collected') AS completedPickups,
      SUM(status = 'expired') AS expiredPosts
     FROM foods
     WHERE restaurant_id = ?`,
    [req.user.id]
  );

  const [foods] = await pool.query(
    `SELECT f.*, c.id AS claim_id, c.status AS claim_status, c.claimed_at, c.collected_at, ngo.name AS ngo_name, ngo.phone AS ngo_phone
     FROM foods f
     LEFT JOIN claims c ON c.food_id = f.id
     LEFT JOIN users ngo ON ngo.id = c.ngo_id
     WHERE f.restaurant_id = ?
     ORDER BY f.created_at DESC`,
    [req.user.id]
  );

  const [[ratingSummary]] = await pool.query(
    `SELECT COALESCE(AVG(rating), 0) AS avgRating, COUNT(rating) as ratingCount
     FROM ratings
     WHERE to_user_id = ?`,
    [req.user.id]
  );

  res.json({ 
    summary: { 
      ...summaryRows[0], 
      avgRating: Number(ratingSummary.avgRating).toFixed(1),
      ratingCount: ratingSummary.ratingCount
    }, 
    foods 
  });
}
