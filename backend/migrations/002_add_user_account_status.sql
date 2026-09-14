-- Apply once to databases created before users.is_active was added to schema.sql.
-- Existing accounts receive the default active status.
ALTER TABLE users
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role;
