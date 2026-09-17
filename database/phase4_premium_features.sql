USE foodbridge;

-- Add veg_non_veg and special_instructions columns to foods table if they don't exist
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'foods' AND COLUMN_NAME = 'veg_non_veg'),
  "ALTER TABLE foods ADD COLUMN veg_non_veg ENUM('veg', 'non-veg') NOT NULL DEFAULT 'veg'",
  "SELECT 'veg_non_veg column already exists'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'foods' AND COLUMN_NAME = 'special_instructions'),
  "ALTER TABLE foods ADD COLUMN special_instructions TEXT NULL",
  "SELECT 'special_instructions column already exists'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add OTP verification columns to users table
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'otp_code'),
  "ALTER TABLE users ADD COLUMN otp_code VARCHAR(6) NULL",
  "SELECT 'otp_code column already exists'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'otp_expires_at'),
  "ALTER TABLE users ADD COLUMN otp_expires_at DATETIME NULL",
  "SELECT 'otp_expires_at column already exists'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
