import { pool } from '../config/db.js';

export async function createReview(req, res) {
  const { claimId, rating, comment } = req.body;
  const fromUserId = req.user.id;

  if (!claimId || !rating) {
    return res.status(400).json({ message: 'Claim ID and rating (1-5) are required' });
  }

  const numericRating = Number(rating);
  if (numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  try {
    // Determine the claim and who is the recipient of the review
    const [claims] = await pool.query(
      `SELECT c.*, f.restaurant_id, c.ngo_id 
       FROM claims c
       JOIN foods f ON f.id = c.food_id
       WHERE c.id = ?`,
      [claimId]
    );

    if (!claims.length) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    const claim = claims[0];
    let toUserId = null;

    if (req.user.role === 'ngo') {
      if (claim.ngo_id !== fromUserId) {
        return res.status(403).json({ message: 'You are not authorized to review this claim' });
      }
      toUserId = claim.restaurant_id;
    } else if (req.user.role === 'restaurant') {
      if (claim.restaurant_id !== fromUserId) {
        return res.status(403).json({ message: 'You are not authorized to review this claim' });
      }
      toUserId = claim.ngo_id;
    } else {
      return res.status(403).json({ message: 'Only restaurants and NGOs can submit reviews' });
    }

    // Insert the review
    await pool.query(
      `INSERT INTO ratings (from_user_id, to_user_id, claim_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
      [fromUserId, toUserId, claimId, numericRating, comment || '']
    );

    // Create a notification for the recipient
    await pool.query(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [toUserId, `You received a new ${numericRating}-star review: "${comment || ''}"`]
    );

    // Emit live socket event
    req.app.get('io').emit('review:created', { toUserId, claimId });

    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Could not submit review' });
  }
}

export async function getReviewsForUser(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.name AS reviewer_name, u.role AS reviewer_role, u.profile_image_url AS reviewer_image
       FROM ratings r
       JOIN users u ON u.id = r.from_user_id
       WHERE r.to_user_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch reviews' });
  }
}

export async function getReviewsByMe(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.name AS recipient_name, u.role AS recipient_role
       FROM ratings r
       JOIN users u ON u.id = r.to_user_id
       WHERE r.from_user_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch your reviews' });
  }
}
