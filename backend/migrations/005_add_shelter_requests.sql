-- Apply once to databases created before shelter requests were persisted.
CREATE TABLE IF NOT EXISTS shelter_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    shelter_id INT NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    preferred_location VARCHAR(255) DEFAULT NULL,
    people_count INT NOT NULL,
    special_requirements TEXT DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_shelter_requests_shelter_status_created (shelter_id, status, created_at),
    INDEX idx_shelter_requests_user_created (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (shelter_id) REFERENCES shelters(id) ON DELETE CASCADE
);
