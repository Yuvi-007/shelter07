-- Apply after 002_add_user_account_status.sql.
-- Add the Authority role without changing existing user roles.
ALTER TABLE users
    MODIFY COLUMN role ENUM('admin', 'manager', 'authority', 'user') NOT NULL DEFAULT 'user';

CREATE TABLE role_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    requested_role ENUM('manager', 'authority') NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    reviewed_by INT DEFAULT NULL,
    INDEX idx_role_requests_user_role_status (user_id, requested_role, status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);
