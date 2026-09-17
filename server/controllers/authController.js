import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: !!user.is_verified, accountStatus: user.account_status },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: !!user.is_verified,
    accountStatus: user.account_status,
    phone: user.phone,
    address: user.address,
    city: user.city,
    state: user.state,
    pinCode: user.pin_code,
    organizationType: user.organization_type,
    description: user.description,
    profileImageUrl: user.profile_image_url,
    maximumNGOPickupDistance: user.maximum_ngo_pickup_distance != null ? Number(user.maximum_ngo_pickup_distance) : 25,
    foodPostingPolicy: user.food_posting_policy || 'strict',
    ngoClaimApproval: user.ngo_claim_approval || 'restaurant_approval',
    claimPickupNotifications: user.claim_pickup_notifications !== undefined && user.claim_pickup_notifications !== null ? Boolean(user.claim_pickup_notifications) : true
  };
}

export async function register(req, res) {
  const { name, email, password, role, phone, address, city } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password, and role are required' });
  }

  if (!['restaurant', 'ngo'].includes(role)) {
    return res.status(400).json({ message: 'Only restaurant and NGO accounts can self-register' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, address, city, account_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [name, email, passwordHash, role, phone || null, address || null, city || null]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const user = rows[0];
    res.status(201).json({ token: signToken(user), user: serializeUser(user) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    res.status(500).json({ message: 'Registration failed' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (user.account_status === 'suspended') {
    return res.status(403).json({ message: 'Your account is suspended. Please contact admin.' });
  }

  if (user.account_status === 'rejected') {
    return res.status(403).json({ message: 'Your account was rejected by admin.' });
  }

  res.json({
    token: signToken(user),
    user: serializeUser(user)
  });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (!rows.length) {
    return res.status(404).json({ message: 'No user registered with this email' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60000); // 10 mins

  await pool.query(
    'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE email = ?',
    [otp, expires, email]
  );

  console.log(`[OTP Send Mock] Email: ${email}, OTP: ${otp}`);

  // In production, send via email. For portfolio demo, we return it.
  res.json({ message: 'OTP code sent successfully', otp });
}

export async function verifyOtp(req, res) {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? AND otp_code = ? AND otp_expires_at > NOW()',
    [email, otp]
  );

  if (!rows.length) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  res.json({ message: 'OTP verified successfully' });
}

export async function resetPassword(req, res) {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    return res.status(400).json({ message: 'Email, OTP, and new password are required' });
  }

  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? AND otp_code = ? AND otp_expires_at > NOW()',
    [email, otp]
  );

  if (!rows.length) {
    return res.status(400).json({ message: 'Invalid or expired OTP session' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    'UPDATE users SET password_hash = ?, otp_code = NULL, otp_expires_at = NULL WHERE email = ?',
    [passwordHash, email]
  );

  res.json({ message: 'Password reset successful' });
}

export async function updateProfile(req, res) {
  const { name, phone, address, city, state, pinCode, organizationType, description, profileImageUrl } = req.body;
  
  try {
    await pool.query(
      `UPDATE users 
       SET name = ?, phone = ?, address = ?, city = ?, state = ?, pin_code = ?, organization_type = ?, description = ?, profile_image_url = ?
       WHERE id = ?`,
      [
        name || null,
        phone || null,
        address || null,
        city || null,
        state || null,
        pinCode || null,
        organizationType || null,
        description || null,
        profileImageUrl || null,
        req.user.id
      ]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    res.json({
      message: 'Profile updated successfully',
      user: serializeUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not update profile' });
  }
}

export async function uploadProfileMedia(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Please choose an image to upload' });
  }

  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }

  try {
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Could not change password' });
  }
}

export async function updateRestaurantSettings(req, res) {
  const { maximumNGOPickupDistance, foodPostingPolicy, ngoClaimApproval, claimPickupNotifications } = req.body;

  const dist = Number(maximumNGOPickupDistance);
  if (isNaN(dist) || dist <= 0) {
    return res.status(400).json({ message: 'Maximum NGO pickup distance must be a valid positive number greater than 0' });
  }

  if (!['strict', 'standard'].includes(foodPostingPolicy)) {
    return res.status(400).json({ message: 'Invalid food posting policy option' });
  }

  if (!['restaurant_approval', 'automatic_approval'].includes(ngoClaimApproval)) {
    return res.status(400).json({ message: 'Invalid NGO claim approval option' });
  }

  const notifBool = Boolean(claimPickupNotifications);

  try {
    await pool.query(
      `UPDATE users
       SET maximum_ngo_pickup_distance = ?, food_posting_policy = ?, ngo_claim_approval = ?, claim_pickup_notifications = ?
       WHERE id = ?`,
      [dist, foodPostingPolicy, ngoClaimApproval, notifBool, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    res.json({
      message: 'Settings saved successfully.',
      user: serializeUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not update restaurant settings' });
  }
}

