-- Apply once to databases created before people_count was added to schema.sql.
-- Legacy redistribution records did not store a count, so they are marked as 0.
ALTER TABLE redistribution_log
    ADD COLUMN people_count INT NOT NULL DEFAULT 0 AFTER to_shelter_id;
