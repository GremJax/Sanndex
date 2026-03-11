ALTER TABLE users ADD email VARCHAR(255);
ALTER TABLE users ALTER COLUMN reputation_score SET DEFAULT 0;
ALTER TABLE reports ALTER COLUMN user_id ADD CONDITION NULLABLE;

ALTER TABLE reports ADD accuracy_score INTEGER DEFAULT 50;
ALTER TABLE reports ADD transparency_score INTEGER DEFAULT 50;
ALTER TABLE reports ADD integrity_score INTEGER DEFAULT 50;
ALTER TABLE reports ADD manipulation_score INTEGER DEFAULT 50;
ALTER TABLE reports ADD authenticity_score INTEGER DEFAULT 50;
ALTER TABLE reports ADD credibility_score INTEGER DEFAULT 50;
