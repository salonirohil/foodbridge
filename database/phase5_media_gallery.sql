USE foodbridge;

CREATE TABLE IF NOT EXISTS media_gallery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('photo', 'video') NOT NULL DEFAULT 'photo',
  url VARCHAR(500) NOT NULL,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
