-- ShelterX database schema
CREATE DATABASE IF NOT EXISTS shelterx;
USE shelterx;

CREATE TABLE IF NOT EXISTS shelters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    total_capacity INT NOT NULL,
    current_occupancy INT NOT NULL DEFAULT 0,
    has_food TINYINT(1) DEFAULT 1,
    has_water TINYINT(1) DEFAULT 1,
    has_medical TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'user', 'authority') NOT NULL DEFAULT 'user',
    shelter_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shelter_id) REFERENCES shelters(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS occupancy_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shelter_id INT NOT NULL,
    occupancy_count INT NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shelter_id) REFERENCES shelters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS redistribution_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_shelter_id INT NOT NULL,
    to_shelter_id INT NOT NULL,
    people_count INT NOT NULL,
    confirmed_by INT NOT NULL,
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_shelter_id) REFERENCES shelters(id) ON DELETE CASCADE,
    FOREIGN KEY (to_shelter_id) REFERENCES shelters(id) ON DELETE CASCADE,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed data
INSERT INTO shelters (name, latitude, longitude, total_capacity, current_occupancy, has_food, has_water, has_medical)
VALUES
('Community Hall A', 19.0760, 72.8777, 200, 150, 1, 1, 0),
('Government School B', 19.0896, 72.8656, 150, 40, 1, 1, 1),
('Sports Complex C', 19.0410, 72.8525, 300, 280, 1, 0, 0);

-- No default users are seeded. Create your first admin account via
-- POST /api/auth/signup with "role": "admin" after starting the backend.
