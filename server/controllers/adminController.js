import { pool } from '../config/db.js';

async function logAdminAction(adminId, action, entityType, entityId, details = '') {
  await pool.query(
    'INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [adminId, action, entityType, entityId || null, details]
  );
}

function userSelect() {
  return `id, name, email, role, phone, address, city, state, pin_code, organization_type,
    description, profile_image_url, is_verified, account_status, created_at`;
}

export async function dashboard(req, res) {
  const [[userCounts]] = await pool.query(
    `SELECT
      SUM(role = 'restaurant') AS totalRestaurants,
      SUM(role = 'ngo') AS totalNgos,
      SUM(role = 'admin') AS totalAdmins,
      SUM(account_status = 'pending') AS pendingUsers,
      SUM(account_status = 'suspended') AS suspendedUsers
     FROM users`
  );

  const [[foodCounts]] = await pool.query(
    `SELECT
      COUNT(*) AS totalFoodPosts,
      SUM(status = 'available') AS availableFood,
      SUM(status = 'claimed') AS activeClaims,
      SUM(status = 'collected') AS collectedFood,
      SUM(status = 'expired') AS expiredFood,
      SUM(status = 'cancelled') AS cancelledFood,
      COALESCE(SUM(CASE WHEN status IN ('claimed', 'collected') THEN quantity_kg ELSE 0 END), 0) AS foodSavedKg
     FROM foods`
  );

  const [[claimCounts]] = await pool.query(
    `SELECT
      COUNT(*) AS totalClaims,
      SUM(status = 'claimed') AS pendingClaims,
      SUM(status = 'collected') AS completedClaims,
      SUM(status = 'cancelled') AS cancelledClaims
     FROM claims`
  );

  const [recentFoods] = await pool.query(
    `SELECT f.id, f.name, f.quantity_kg, f.status, f.created_at, u.name AS restaurant_name
     FROM foods f
     JOIN users u ON u.id = f.restaurant_id
     ORDER BY f.created_at DESC
     LIMIT 5`
  );

  const [weeklyFoodRows] = await pool.query(
    `SELECT DATE(created_at) AS day, COALESCE(SUM(quantity_kg), 0) AS kg
     FROM foods
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(created_at)
     ORDER BY day ASC`
  );

  const foodSavedKg = Number(foodCounts.foodSavedKg || 0);
  const weeklyLookup = new Map(
    weeklyFoodRows.map(row => [new Date(row.day).toISOString().slice(0, 10), Number(row.kg || 0)])
  );
  const weeklyPostedKg = Array.from({ length: 7 }, (_value, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return weeklyLookup.get(key) || 0;
  });

  res.json({
    cards: {
      ...userCounts,
      ...foodCounts,
      ...claimCounts,
      mealsServed: Math.round(foodSavedKg * 4),
      co2SavedKg: Math.round(foodSavedKg * 2.5)
    },
    recentFoods,
    weeklyPostedKg
  });
}

export async function listUsers(req, res) {
  const { role, status, search = '' } = req.query;
  const params = [];
  const where = [];

  if (role) {
    where.push('role = ?');
    params.push(role);
  }

  if (status) {
    where.push('account_status = ?');
    params.push(status);
  }

  if (search) {
    where.push('(name LIKE ? OR email LIKE ? OR city LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT ${userSelect()} FROM users ${sqlWhere} ORDER BY created_at DESC`,
    params
  );
  res.json(rows);
}

export async function listRestaurants(req, res) {
  req.query.role = 'restaurant';
  return listUsers(req, res);
}

export async function listNgos(req, res) {
  req.query.role = 'ngo';
  return listUsers(req, res);
}

export async function approveUser(req, res) {
  await pool.query(
    "UPDATE users SET is_verified = TRUE, account_status = 'active' WHERE id = ? AND role IN ('restaurant', 'ngo')",
    [req.params.id]
  );
  await pool.query(
    'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
    [req.params.id, 'Your FoodBridge account has been approved.']
  );
  await logAdminAction(req.user.id, 'approve', 'user', req.params.id);
  res.json({ message: 'User approved' });
}

export async function rejectUser(req, res) {
  await pool.query(
    "UPDATE users SET is_verified = FALSE, account_status = 'rejected' WHERE id = ? AND role IN ('restaurant', 'ngo')",
    [req.params.id]
  );
  await pool.query(
    'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
    [req.params.id, 'Your FoodBridge account was rejected by admin.']
  );
  await logAdminAction(req.user.id, 'reject', 'user', req.params.id, req.body?.reason || '');
  res.json({ message: 'User rejected' });
}

export async function suspendUser(req, res) {
  await pool.query(
    "UPDATE users SET is_verified = FALSE, account_status = 'suspended' WHERE id = ? AND role IN ('restaurant', 'ngo')",
    [req.params.id]
  );
  await pool.query(
    'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
    [req.params.id, 'Your FoodBridge account has been suspended.']
  );
  await logAdminAction(req.user.id, 'suspend', 'user', req.params.id, req.body?.reason || '');
  res.json({ message: 'User suspended' });
}

export async function deleteUser(req, res) {
  await pool.query("DELETE FROM users WHERE id = ? AND role IN ('restaurant', 'ngo')", [req.params.id]);
  await logAdminAction(req.user.id, 'delete', 'user', req.params.id);
  res.json({ message: 'User deleted' });
}

export async function listFoodPosts(req, res) {
  const { status, search = '' } = req.query;
  const params = [];
  const where = [];

  if (status) {
    where.push('f.status = ?');
    params.push(status);
  }

  if (search) {
    where.push('(f.name LIKE ? OR f.address LIKE ? OR u.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT f.*, u.name AS restaurant_name, u.email AS restaurant_email
     FROM foods f
     JOIN users u ON u.id = f.restaurant_id
     ${sqlWhere}
     ORDER BY f.created_at DESC`,
    params
  );
  res.json(rows);
}

export async function deleteFoodPost(req, res) {
  await pool.query('DELETE FROM foods WHERE id = ?', [req.params.id]);
  await logAdminAction(req.user.id, 'delete_fake_food', 'food', req.params.id);
  req.app.get('io').emit('food:deleted', { id: Number(req.params.id) });
  req.app.get('io').emit('food:changed');
  res.json({ message: 'Food post deleted' });
}

export async function markFoodUnsafe(req, res) {
  await pool.query("UPDATE foods SET is_unsafe = TRUE, status = 'cancelled' WHERE id = ?", [req.params.id]);
  await logAdminAction(req.user.id, 'mark_unsafe', 'food', req.params.id);
  req.app.get('io').emit('food:changed');
  res.json({ message: 'Food marked unsafe' });
}

export async function removeExpiredFoods(req, res) {
  const [result] = await pool.query("DELETE FROM foods WHERE status = 'expired' OR expiry_time <= NOW()");
  await logAdminAction(req.user.id, 'remove_expired_foods', 'food', null, `${result.affectedRows} removed`);
  req.app.get('io').emit('food:changed');
  res.json({ message: `${result.affectedRows} expired food posts removed` });
}

export async function listClaims(req, res) {
  const [rows] = await pool.query(
    `SELECT c.*, f.name AS food_name, f.quantity_kg, f.status AS food_status,
      ngo.name AS ngo_name, restaurant.name AS restaurant_name
     FROM claims c
     JOIN foods f ON f.id = c.food_id
     JOIN users ngo ON ngo.id = c.ngo_id
     JOIN users restaurant ON restaurant.id = f.restaurant_id
     ORDER BY c.claimed_at DESC`
  );
  res.json(rows);
}

export async function updateClaimStatus(req, res) {
  const { status } = req.body;
  if (!['claimed', 'cancelled', 'collected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid claim status' });
  }

  const [claims] = await pool.query('SELECT * FROM claims WHERE id = ?', [req.params.id]);
  const claim = claims[0];
  if (!claim) return res.status(404).json({ message: 'Claim not found' });

  await pool.query(
    'UPDATE claims SET status = ?, collected_at = CASE WHEN ? = "collected" THEN NOW() ELSE collected_at END WHERE id = ?',
    [status, status, req.params.id]
  );

  const foodStatus = status === 'collected' ? 'collected' : status === 'cancelled' ? 'available' : 'claimed';
  await pool.query('UPDATE foods SET status = ? WHERE id = ?', [foodStatus, claim.food_id]);
  await logAdminAction(req.user.id, 'update_claim_status', 'claim', req.params.id, status);
  req.app.get('io').emit('food:changed');
  res.json({ message: 'Claim updated' });
}

export async function analytics(req, res) {
  const [monthly] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS posts, COALESCE(SUM(quantity_kg), 0) AS kg
     FROM foods
     GROUP BY DATE_FORMAT(created_at, '%Y-%m')
     ORDER BY month DESC
     LIMIT 12`
  );

  const [topRestaurants] = await pool.query(
    `SELECT u.id, u.name, COUNT(f.id) AS posts, COALESCE(SUM(f.quantity_kg), 0) AS kg
     FROM users u
     LEFT JOIN foods f ON f.restaurant_id = u.id
     WHERE u.role = 'restaurant'
     GROUP BY u.id, u.name
     ORDER BY kg DESC
     LIMIT 10`
  );

  const [topNgos] = await pool.query(
    `SELECT u.id, u.name, COUNT(c.id) AS claims
     FROM users u
     LEFT JOIN claims c ON c.ngo_id = u.id
     WHERE u.role = 'ngo'
     GROUP BY u.id, u.name
     ORDER BY claims DESC
     LIMIT 10`
  );

  const [byStatus] = await pool.query(
    'SELECT status, COUNT(*) AS count, COALESCE(SUM(quantity_kg), 0) AS kg FROM foods GROUP BY status'
  );

  res.json({ monthly, topRestaurants, topNgos, byStatus });
}

export async function reports(req, res) {
  const [auditLogs] = await pool.query(
    `SELECT a.*, u.name AS admin_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.admin_id
     ORDER BY a.created_at DESC
     LIMIT 100`
  );

  const [openReports] = await pool.query(
    `SELECT r.*, reporter.name AS reporter_name, target.name AS target_user_name, f.name AS food_name
     FROM reports r
     LEFT JOIN users reporter ON reporter.id = r.reporter_id
     LEFT JOIN users target ON target.id = r.target_user_id
     LEFT JOIN foods f ON f.id = r.food_id
     ORDER BY r.created_at DESC`
  );

  res.json({ auditLogs, openReports });
}

export async function impact(req, res) {
  const [rows] = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN status IN ('claimed', 'collected') THEN quantity_kg ELSE 0 END), 0) AS foodSavedKg,
      COUNT(CASE WHEN status IN ('claimed', 'collected') THEN 1 END) AS successfulDonations
     FROM foods`
  );

  const foodSavedKg = Number(rows[0].foodSavedKg);
  res.json({
    foodSavedKg,
    mealsServed: Math.round(foodSavedKg * 4),
    co2SavedKg: Math.round(foodSavedKg * 2.5),
    successfulDonations: rows[0].successfulDonations
  });
}

export async function listAllReviews(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, 
              from_u.name AS from_user_name, from_u.role AS from_user_role,
              to_u.name AS to_user_name, to_u.role AS to_user_role
       FROM ratings r
       JOIN users from_u ON from_u.id = r.from_user_id
       JOIN users to_u ON to_u.id = r.to_user_id
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch reviews' });
  }
}

export async function deleteReview(req, res) {
  try {
    await pool.query('DELETE FROM ratings WHERE id = ?', [req.params.id]);
    await logAdminAction(req.user.id, 'delete_review', 'review', req.params.id);
    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete review' });
  }
}
