CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  google_id TEXT UNIQUE,
  username TEXT,
  reputation_score INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sources (
  id SERIAL PRIMARY KEY,
  name TEXT,
  verification_status TEXT DEFAULT 'unverified',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE source_domains (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
  domain TEXT UNIQUE
);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES sources(id),
  user_id INTEGER REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  evidence_url TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES sources(id),
  status TEXT DEFAULT 'pending',
  num INTEGER DEFAULT 1,
  score_type TEXT DEFAULT 'scored',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  review INTEGER REFERENCES reviews(id),
  user_id INTEGER REFERENCES users(id),
  changed TEXT,
  reason TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_log_reports (
  audit_id INTEGER REFERENCES audit_log(id) ON DELETE CASCADE,
  report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  PRIMARY KEY (audit_id, report_id)
);