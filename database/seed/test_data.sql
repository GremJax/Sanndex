INSERT INTO users (id, username) VALUES (0, 'alice');
INSERT INTO users (username) VALUES ('bob');

INSERT INTO sources (id, name, verification_status) 
VALUES (0, 'example news network', 'unverified');
INSERT INTO source_domains (source_id, domain) 
VALUES (0, 'examplenewsnetwork.com');

INSERT INTO reviews (id, source_id, status, accuracy_score)
VALUES (0, 0, 'reviewed', 20);
INSERT INTO audit_log (review, user_id, changed, reason)
VALUES (0, 0, 'changed accuracy to 20', 'test');