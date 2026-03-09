INSERT INTO users (id, username) VALUES (1, 'alice');
INSERT INTO users (username) VALUES ('bob');

INSERT INTO sources (id, name, verification_status) 
VALUES (1, 'example news network', 'unverified');
INSERT INTO source_domains (source_id, domain) 
VALUES (1, 'examplenewsnetwork.com');

INSERT INTO reviews (id, source_id, status, accuracy_score)
VALUES (1, 1, 'reviewed', 20);
INSERT INTO audit_log (review, user_id, changed, reason)
VALUES (1, 1, 'changed accuracy to 20', 'test');