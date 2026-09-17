import { pool } from '../config/db.js';

async function expireOldAvailableFoods() {
  await pool.query(
    "UPDATE foods SET status = 'expired' WHERE status = 'available' AND expiry_time <= NOW()"
  );
}

function toNumber(value, decimals = 0) {
  const numeric = Number(value || 0);
  return Number(numeric.toFixed(decimals));
}

export async function getHomepageData(_req, res) {
  try {
    await expireOldAvailableFoods();

    const [[foodSummary]] = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN status <> 'cancelled' AND is_unsafe = FALSE THEN quantity_kg ELSE 0 END), 0) AS totalFoodSharedKg,
        COALESCE(SUM(CASE WHEN status IN ('claimed', 'collected') AND is_unsafe = FALSE THEN quantity_kg ELSE 0 END), 0) AS foodSavedKg,
        SUM(CASE WHEN status = 'available' AND expiry_time > NOW() THEN 1 ELSE 0 END) AS availablePosts,
        SUM(CASE WHEN status = 'collected' THEN 1 ELSE 0 END) AS completedPickups,
        SUM(CASE WHEN status IN ('claimed', 'collected') THEN 1 ELSE 0 END) AS successfulDonations
       FROM foods`
    );

    const [[partnerSummary]] = await pool.query(
      `SELECT
        SUM(CASE WHEN role = 'restaurant' AND account_status IN ('pending', 'active') THEN 1 ELSE 0 END) AS restaurants,
        SUM(CASE WHEN role = 'ngo' AND account_status IN ('pending', 'active') THEN 1 ELSE 0 END) AS ngos,
        COUNT(DISTINCT CASE
          WHEN role IN ('restaurant', 'ngo')
          AND account_status IN ('pending', 'active')
          AND TRIM(COALESCE(city, '')) <> ''
          THEN city
          ELSE NULL
        END) AS citiesCovered
       FROM users
       WHERE role IN ('restaurant', 'ngo')`
    );

    const foodSavedKg = toNumber(foodSummary.foodSavedKg, 1);

    const [recentFoods] = await pool.query(
      `SELECT
        f.id,
        f.name,
        f.quantity_kg,
        f.status,
        f.pickup_time,
        f.expiry_time,
        f.image_url,
        f.address,
        f.created_at,
        u.name AS restaurant_name,
        u.city AS restaurant_city
       FROM foods f
       JOIN users u ON u.id = f.restaurant_id
       WHERE f.status IN ('available', 'claimed', 'collected') AND f.is_unsafe = FALSE
       ORDER BY f.created_at DESC
       LIMIT 6`
    );

    const [recentReviews] = await pool.query(
      `SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        reviewer.name AS reviewer_name,
        reviewer.role AS reviewer_role,
        recipient.name AS recipient_name,
        recipient.role AS recipient_role
       FROM ratings r
       JOIN users reviewer ON reviewer.id = r.from_user_id
       JOIN users recipient ON recipient.id = r.to_user_id
       WHERE TRIM(COALESCE(r.comment, '')) <> ''
       ORDER BY r.created_at DESC
       LIMIT 6`
    );

    res.json({
      stats: {
        totalFoodSharedKg: toNumber(foodSummary.totalFoodSharedKg, 1),
        foodSavedKg,
        availablePosts: Number(foodSummary.availablePosts || 0),
        completedPickups: Number(foodSummary.completedPickups || 0),
        activeRestaurants: Number(partnerSummary.restaurants || 0),
        activeNgos: Number(partnerSummary.ngos || 0),
        successfulDonations: Number(foodSummary.successfulDonations || 0),
        mealsServed: Math.round(foodSavedKg * 4),
        co2SavedKg: Math.round(foodSavedKg * 2.5),
        citiesCovered: Number(partnerSummary.citiesCovered || 0)
      },
      recentFoods,
      recentReviews
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not load homepage data' });
  }
}

export async function getPublicPartners(_req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, role, city, state, description, profile_image_url, is_verified, created_at
       FROM users
       WHERE role IN ('restaurant', 'ngo')
         AND account_status IN ('active', 'pending')
       ORDER BY (profile_image_url IS NOT NULL AND profile_image_url <> '') DESC, is_verified DESC, created_at DESC
       LIMIT 20`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Could not load partners network' });
  }
}
