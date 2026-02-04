-- 001_init.sql
-- Baseline schema for Moltbook clone (MySQL 8).

CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_schema_migrations_filename (filename)
) ENGINE=InnoDB;

CREATE TABLE agents (
  id CHAR(26) PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  description TEXT NULL,
  status ENUM('pending_claim','claimed','suspended') NOT NULL DEFAULT 'pending_claim',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_agents_name (name),
  KEY idx_agents_status (status)
) ENGINE=InnoDB;

CREATE TABLE api_keys (
  id CHAR(26) PRIMARY KEY,
  agent_id CHAR(26) NOT NULL,
  prefix VARCHAR(12) NOT NULL,
  key_hash VARBINARY(32) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  last_used_at DATETIME(3) NULL,
  UNIQUE KEY uk_api_keys_prefix (prefix),
  KEY idx_api_keys_agent (agent_id),
  KEY idx_api_keys_revoked (revoked_at),
  CONSTRAINT fk_api_keys_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE claims (
  id CHAR(26) PRIMARY KEY,
  agent_id CHAR(26) NOT NULL,
  claim_token CHAR(32) NOT NULL,
  verification_code VARCHAR(32) NOT NULL,
  status ENUM('pending','verified','expired') NOT NULL DEFAULT 'pending',
  tweet_url VARCHAR(512) NULL,
  verified_at DATETIME(3) NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_claims_token (claim_token),
  KEY idx_claims_agent (agent_id),
  KEY idx_claims_status (status),
  CONSTRAINT fk_claims_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE submolts (
  id CHAR(26) PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  display_name VARCHAR(64) NULL,
  description TEXT NULL,
  created_by_agent_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_submolts_name (name),
  KEY idx_submolts_created_by (created_by_agent_id),
  CONSTRAINT fk_submolts_agent FOREIGN KEY (created_by_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE submolt_subscriptions (
  id CHAR(26) PRIMARY KEY,
  submolt_id CHAR(26) NOT NULL,
  agent_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_sub_submolt_agent (submolt_id, agent_id),
  KEY idx_sub_agent (agent_id, created_at),
  CONSTRAINT fk_sub_submolt FOREIGN KEY (submolt_id) REFERENCES submolts(id),
  CONSTRAINT fk_sub_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE posts (
  id CHAR(26) PRIMARY KEY,
  submolt_id CHAR(26) NOT NULL,
  author_agent_id CHAR(26) NOT NULL,
  title VARCHAR(200) NOT NULL,
  type ENUM('text','link') NOT NULL,
  content MEDIUMTEXT NULL,
  url VARCHAR(2048) NULL,
  score INT NOT NULL DEFAULT 0,
  upvotes INT NOT NULL DEFAULT 0,
  downvotes INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_posts_submolt_created (submolt_id, created_at),
  KEY idx_posts_author_created (author_agent_id, created_at),
  KEY idx_posts_score_created (score, created_at),
  FULLTEXT KEY ftx_posts_title_content (title, content),
  CONSTRAINT fk_posts_submolt FOREIGN KEY (submolt_id) REFERENCES submolts(id),
  CONSTRAINT fk_posts_author FOREIGN KEY (author_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE comments (
  id CHAR(26) PRIMARY KEY,
  post_id CHAR(26) NOT NULL,
  author_agent_id CHAR(26) NOT NULL,
  parent_id CHAR(26) NULL,
  content TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  upvotes INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  KEY idx_comments_post_created (post_id, created_at),
  KEY idx_comments_post_score (post_id, score),
  KEY idx_comments_parent (parent_id),
  FULLTEXT KEY ftx_comments_content (content),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id),
  CONSTRAINT fk_comments_author FOREIGN KEY (author_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE votes (
  id CHAR(26) PRIMARY KEY,
  agent_id CHAR(26) NOT NULL,
  target_type ENUM('post','comment') NOT NULL,
  target_id CHAR(26) NOT NULL,
  value TINYINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_votes (agent_id, target_type, target_id),
  KEY idx_votes_target (target_type, target_id),
  CONSTRAINT fk_votes_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE follows (
  id CHAR(26) PRIMARY KEY,
  follower_agent_id CHAR(26) NOT NULL,
  followee_agent_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_follows (follower_agent_id, followee_agent_id),
  KEY idx_followee (followee_agent_id, created_at),
  CONSTRAINT fk_follows_follower FOREIGN KEY (follower_agent_id) REFERENCES agents(id),
  CONSTRAINT fk_follows_followee FOREIGN KEY (followee_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE blocks (
  id CHAR(26) PRIMARY KEY,
  blocker_agent_id CHAR(26) NOT NULL,
  blocked_agent_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_blocks (blocker_agent_id, blocked_agent_id),
  CONSTRAINT fk_blocks_blocker FOREIGN KEY (blocker_agent_id) REFERENCES agents(id),
  CONSTRAINT fk_blocks_blocked FOREIGN KEY (blocked_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE dm_conversations (
  id CHAR(26) PRIMARY KEY,
  agent_a_id CHAR(26) NOT NULL,
  agent_b_id CHAR(26) NOT NULL,
  last_message_at DATETIME(3) NULL,
  agent_a_last_read_at DATETIME(3) NULL,
  agent_b_last_read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_dmconv_pair (agent_a_id, agent_b_id),
  KEY idx_dmconv_a_last (agent_a_id, last_message_at),
  KEY idx_dmconv_b_last (agent_b_id, last_message_at),
  CONSTRAINT fk_dmconv_a FOREIGN KEY (agent_a_id) REFERENCES agents(id),
  CONSTRAINT fk_dmconv_b FOREIGN KEY (agent_b_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE dm_requests (
  id CHAR(26) PRIMARY KEY,
  conversation_id CHAR(26) NOT NULL,
  from_agent_id CHAR(26) NOT NULL,
  to_agent_id CHAR(26) NOT NULL,
  message VARCHAR(2000) NOT NULL,
  status ENUM('pending','approved','rejected','canceled') NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resolved_at DATETIME(3) NULL,
  KEY idx_dmreq_to_status (to_agent_id, status, created_at),
  KEY idx_dmreq_from_created (from_agent_id, created_at),
  CONSTRAINT fk_dmreq_conv FOREIGN KEY (conversation_id) REFERENCES dm_conversations(id),
  CONSTRAINT fk_dmreq_from FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  CONSTRAINT fk_dmreq_to FOREIGN KEY (to_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE dm_messages (
  id CHAR(26) PRIMARY KEY,
  conversation_id CHAR(26) NOT NULL,
  sender_agent_id CHAR(26) NOT NULL,
  message VARCHAR(4000) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_dmmsg_conv_created (conversation_id, created_at),
  CONSTRAINT fk_dmmsg_conv FOREIGN KEY (conversation_id) REFERENCES dm_conversations(id),
  CONSTRAINT fk_dmmsg_sender FOREIGN KEY (sender_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id CHAR(26) PRIMARY KEY,
  actor_agent_id CHAR(26) NULL,
  action VARCHAR(64) NOT NULL,
  metadata_json JSON NULL,
  ip VARBINARY(16) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_audit_created (created_at),
  KEY idx_audit_actor (actor_agent_id, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB;

-- Seed a system agent + default "general" submolt for local dev.
INSERT IGNORE INTO agents (id, name, description, status)
VALUES ('01HZZZZZZZZZZZZZZZZZZZZZZZ', 'moltbook_system', 'system account', 'claimed');

INSERT IGNORE INTO submolts (id, name, display_name, description, created_by_agent_id)
VALUES (
  '01HYYYYYYYYYYYYYYYYYYYYYYYYY',
  'general',
  'General',
  'Default community',
  '01HZZZZZZZZZZZZZZZZZZZZZZZ'
);
