CREATE DATABASE IF NOT EXISTS foodbridge;
USE foodbridge;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('restaurant', 'ngo', 'admin') NOT NULL,
  phone VARCHAR(30),
  address TEXT,
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_verified BOOLEAN DEFAULT FALSE,
  account_status ENUM('pending', 'active', 'rejected', 'suspended') DEFAULT 'pending',
  state VARCHAR(100),
  pin_code VARCHAR(20),
  organization_type VARCHAR(120),
  description TEXT,
  profile_image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE foods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  name VARCHAR(140) NOT NULL,
  quantity_kg DECIMAL(10, 2) NOT NULL,
  expiry_time DATETIME NOT NULL,
  pickup_time DATETIME NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  status ENUM('available', 'claimed', 'collected', 'expired', 'cancelled') DEFAULT 'available',
  category VARCHAR(80),
  is_unsafe BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_foods_status (status),
  INDEX idx_foods_pickup_time (pickup_time)
);

CREATE TABLE claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  food_id INT NOT NULL,
  ngo_id INT NOT NULL,
  status ENUM('claimed', 'cancelled', 'collected') DEFAULT 'claimed',
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  collected_at DATETIME NULL,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE,
  FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_active_food_claim (food_id)
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message VARCHAR(255) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  claim_id INT NOT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NULL,
  food_id INT NULL,
  target_user_id INT NULL,
  reason VARCHAR(255) NOT NULL,
  status ENUM('open', 'reviewed', 'closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE SET NULL,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id INT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE impact_counter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  food_saved_kg DECIMAL(12, 2) DEFAULT 0,
  meals_served INT DEFAULT 0,
  co2_saved_kg DECIMAL(12, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
