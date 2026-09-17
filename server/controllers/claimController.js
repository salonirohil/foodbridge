import { pool } from '../config/db.js';

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function claimFood(req, res) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [foods] = await connection.query(
      `SELECT f.*, u.maximum_ngo_pickup_distance, u.ngo_claim_approval, u.claim_pickup_notifications, u.latitude AS rest_lat, u.longitude AS rest_lng
       FROM foods f
       JOIN users u ON u.id = f.restaurant_id
       WHERE f.id = ? AND f.status = 'available' FOR UPDATE`,
      [req.body.foodId]
    );

    const food = foods[0];
    if (!food) {
      await connection.rollback();
      return res.status(409).json({ message: 'Food is no longer available' });
    }

    // 1. Check NGO distance setting if coordinates exist
    const [ngoRows] = await connection.query("SELECT latitude, longitude FROM users WHERE id = ?", [req.user.id]);
    const ngoUser = ngoRows[0];
    const maxDist = food.maximum_ngo_pickup_distance != null ? Number(food.maximum_ngo_pickup_distance) : 25;

    if (food.rest_lat && food.rest_lng && ngoUser?.latitude && ngoUser?.longitude) {
      const calculatedDist = getDistanceKm(Number(food.rest_lat), Number(food.rest_lng), Number(ngoUser.latitude), Number(ngoUser.longitude));
      if (calculatedDist > maxDist) {
        await connection.rollback();
        return res.status(400).json({ message: `NGO location is outside this restaurant's maximum pickup distance limit (${maxDist} km)` });
      }
    }

    // 2. NGO Claim Approval logic
    const requiresApproval = (food.ngo_claim_approval || 'restaurant_approval') === 'restaurant_approval';
    const claimStatus = requiresApproval ? 'pending' : 'claimed';
    const foodStatus = requiresApproval ? 'pending_approval' : 'claimed';

    const [claimResult] = await connection.query(
      'INSERT INTO claims (food_id, ngo_id, status) VALUES (?, ?, ?)',
      [food.id, req.user.id, claimStatus]
    );

    await connection.query("UPDATE foods SET status = ? WHERE id = ?", [foodStatus, food.id]);

    // 3. Notifications setting check (claim_pickup_notifications)
    const notifEnabled = food.claim_pickup_notifications !== 0 && food.claim_pickup_notifications !== false;
    if (notifEnabled) {
      const notifMsg = requiresApproval
        ? `${req.user.name} requested to claim your food post: ${food.name} (Approval Required)`
        : `${req.user.name} claimed your food post: ${food.name}`;

      await connection.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [food.restaurant_id, notifMsg]
      );
    }

    await connection.commit();

    const payload = { claimId: claimResult.insertId, foodId: food.id, ngoId: req.user.id, status: claimStatus };
    req.app.get('io').emit(requiresApproval ? 'food:requested' : 'food:claimed', payload);
    req.app.get('io').emit('food:changed');
    
    const responseMsg = requiresApproval
      ? 'Claim request submitted! Awaiting restaurant approval before pickup.'
      : 'Food claimed successfully! Coordinates are ready under My Claims.';

    res.status(201).json({ ...payload, message: responseMsg });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Claim failed' });
  } finally {
    connection.release();
  }
}

export async function approveClaim(req, res) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [claims] = await connection.query(
      `SELECT c.*, f.name AS food_name, f.restaurant_id, ngo.id AS ngo_id, ngo.name AS ngo_name, r.claim_pickup_notifications
       FROM claims c
       JOIN foods f ON f.id = c.food_id
       JOIN users ngo ON ngo.id = c.ngo_id
       JOIN users r ON r.id = f.restaurant_id
       WHERE c.id = ? AND f.restaurant_id = ? AND c.status = 'pending'`,
      [req.params.id, req.user.id]
    );

    const claim = claims[0];
    if (!claim) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pending claim request not found' });
    }

    await connection.query("UPDATE claims SET status = 'claimed' WHERE id = ?", [claim.id]);
    await connection.query("UPDATE foods SET status = 'claimed' WHERE id = ?", [claim.food_id]);

    // Always notify NGO when their claim request is approved
    await connection.query(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [claim.ngo_id, `Your claim request for "${claim.food_name}" was approved by the restaurant! Pickup can proceed.`]
    );

    // Notify restaurant if claim & pickup notifications setting is ON
    const notifEnabled = claim.claim_pickup_notifications !== 0 && claim.claim_pickup_notifications !== false;
    if (notifEnabled) {
      await connection.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [claim.restaurant_id, `Claim request for "${claim.food_name}" by ${claim.ngo_name} has been approved.`]
      );
    }

    await connection.commit();

    req.app.get('io').emit('food:updated', { id: claim.food_id, status: 'claimed' });
    req.app.get('io').emit('food:changed');
    res.json({ message: 'Claim request approved successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Could not approve claim' });
  } finally {
    connection.release();
  }
}

export async function rejectClaim(req, res) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [claims] = await connection.query(
      `SELECT c.*, f.name AS food_name, f.restaurant_id, ngo.id AS ngo_id, ngo.name AS ngo_name, r.claim_pickup_notifications
       FROM claims c
       JOIN foods f ON f.id = c.food_id
       JOIN users ngo ON ngo.id = c.ngo_id
       JOIN users r ON r.id = f.restaurant_id
       WHERE c.id = ? AND f.restaurant_id = ? AND c.status = 'pending'`,
      [req.params.id, req.user.id]
    );

    const claim = claims[0];
    if (!claim) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pending claim request not found' });
    }

    await connection.query("UPDATE claims SET status = 'rejected' WHERE id = ?", [claim.id]);
    await connection.query("UPDATE foods SET status = 'available' WHERE id = ?", [claim.food_id]);

    // Always notify NGO when claim request is declined
    await connection.query(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [claim.ngo_id, `Your claim request for "${claim.food_name}" was declined by the restaurant.`]
    );

    // Notify restaurant if claim & pickup notifications setting is ON
    const notifEnabled = claim.claim_pickup_notifications !== 0 && claim.claim_pickup_notifications !== false;
    if (notifEnabled) {
      await connection.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [claim.restaurant_id, `Claim request for "${claim.food_name}" by ${claim.ngo_name} was rejected.`]
      );
    }

    await connection.commit();

    req.app.get('io').emit('food:updated', { id: claim.food_id, status: 'available' });
    req.app.get('io').emit('food:changed');
    res.json({ message: 'Claim request rejected' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Could not reject claim' });
  } finally {
    connection.release();
  }
}

export async function myClaims(req, res) {
  const [rows] = await pool.query(
    `SELECT c.*, f.name, f.quantity_kg, f.pickup_time, f.address, u.name AS restaurant_name
     FROM claims c
     JOIN foods f ON f.id = c.food_id
     JOIN users u ON u.id = f.restaurant_id
     WHERE c.ngo_id = ?
     ORDER BY c.claimed_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}

export async function cancelClaim(req, res) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [claims] = await connection.query(
      "SELECT c.*, r.claim_pickup_notifications, f.name AS food_name FROM claims c JOIN foods f ON f.id = c.food_id JOIN users r ON r.id = f.restaurant_id WHERE c.id = ? AND c.ngo_id = ? AND c.status IN ('claimed', 'pending')",
      [req.params.id, req.user.id]
    );

    const claim = claims[0];
    if (!claim) {
      await connection.rollback();
      return res.status(404).json({ message: 'Active claim not found' });
    }

    await connection.query("UPDATE claims SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    await connection.query("UPDATE foods SET status = 'available' WHERE id = ?", [claim.food_id]);

    const notifEnabled = claim.claim_pickup_notifications !== 0 && claim.claim_pickup_notifications !== false;
    if (notifEnabled) {
      await connection.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [claim.restaurant_id, `Claim for food post "${claim.food_name}" was cancelled by the NGO.`]
      );
    }

    await connection.commit();

    req.app.get('io').emit('food:updated', { id: claim.food_id, status: 'available' });
    req.app.get('io').emit('food:changed');
    res.json({ message: 'Claim cancelled' });
  } catch {
    await connection.rollback();
    res.status(500).json({ message: 'Could not cancel claim' });
  } finally {
    connection.release();
  }
}

