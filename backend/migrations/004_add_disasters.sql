-- Apply after 003_add_role_requests.sql.
CREATE TABLE IF NOT EXISTS disasters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    disaster_type VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    description TEXT DEFAULT NULL,
    start_date DATE NOT NULL,
    status ENUM('active', 'closed') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_disasters_status_start_date (status, start_date)
);
