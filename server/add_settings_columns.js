import { pool } from './config/db.js';

async function migrate() {
  const columns = [
    { name: 'maximum_ngo_pickup_distance', type: 'INT DEFAULT 25' },
    { name: 'food_posting_policy', type: "VARCHAR(50) DEFAULT 'strict'" },
    { name: 'ngo_claim_approval', type: "VARCHAR(50) DEFAULT 'restaurant_approval'" },
    { name: 'claim_pickup_notifications', type: 'BOOLEAN DEFAULT TRUE' }
  ];

  for (const col of columns) {
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
      console.log(`Added column ${col.name}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`Column ${col.name} already exists`);
      } else {
        console.error(`Error adding ${col.name}:`, err.message);
      }
    }
  }

  try {
    await pool.query(
      "ALTER TABLE claims MODIFY COLUMN status ENUM('pending', 'claimed', 'approved', 'rejected', 'cancelled', 'collected') DEFAULT 'pending'"
    );
    console.log("Updated claims status enum");
  } catch (err) {
    console.error("Claims enum error:", err.message);
  }

  try {
    await pool.query(
      "ALTER TABLE foods MODIFY COLUMN status ENUM('available', 'pending_approval', 'claimed', 'collected', 'expired', 'cancelled') DEFAULT 'available'"
    );
    console.log("Updated foods status enum");
  } catch (err) {
    console.error("Foods enum error:", err.message);
  }

  process.exit(0);
}

migrate();
