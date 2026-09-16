CREATE TABLE IF NOT EXISTS account_users (
 id VARCHAR(64) PRIMARY KEY,
 email VARCHAR(254) NOT NULL UNIQUE,
 name VARCHAR(80) NOT NULL,
 password_hash VARCHAR(255) NULL,
 google_sub VARCHAR(255) NULL UNIQUE,
 created BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS account_sessions (
 token_hash CHAR(64) PRIMARY KEY,
 user_id VARCHAR(64) NOT NULL,
 expires BIGINT NOT NULL,
 INDEX(user_id),
 FOREIGN KEY(user_id) REFERENCES account_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS account_challenges (
 id CHAR(64) PRIMARY KEY,
 email VARCHAR(254) NOT NULL,
 purpose VARCHAR(16) NOT NULL,
 code_hash CHAR(64) NOT NULL,
 payload MEDIUMTEXT NOT NULL,
 expires BIGINT NOT NULL,
 attempts INT NOT NULL DEFAULT 0,
 INDEX(email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS account_nonces (
 nonce_hash CHAR(64) PRIMARY KEY,
 expires BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS account_limits (
 bucket CHAR(64) PRIMARY KEY,
 hits INT NOT NULL,
 expires BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS account_progress (
 user_id VARCHAR(64) PRIMARY KEY,
 revision INT NOT NULL DEFAULT 0,
 payload MEDIUMTEXT NULL,
 updated VARCHAR(32) NOT NULL,
 FOREIGN KEY(user_id) REFERENCES account_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS account_versions (
 user_id VARCHAR(64) NOT NULL,
 revision INT NOT NULL,
 payload MEDIUMTEXT NOT NULL,
 updated VARCHAR(32) NOT NULL,
 PRIMARY KEY(user_id, revision),
 FOREIGN KEY(user_id) REFERENCES account_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS account_mail (
 id CHAR(64) PRIMARY KEY,
 email VARCHAR(254) NOT NULL,
 payload MEDIUMTEXT NOT NULL,
 attempts INT NOT NULL DEFAULT 0,
 available BIGINT NOT NULL,
 locked_until BIGINT NOT NULL DEFAULT 0,
 created BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_profiles (
 user_id VARCHAR(64) PRIMARY KEY,
 handle VARCHAR(24) NOT NULL UNIQUE,
 name VARCHAR(80) NOT NULL,
 bio VARCHAR(500) NOT NULL DEFAULT '',
 level VARCHAR(16) NOT NULL DEFAULT 'beginner',
 avatar VARCHAR(64) NOT NULL DEFAULT 'mountain',
 training_place VARCHAR(120) NOT NULL DEFAULT '',
 city VARCHAR(120) NOT NULL DEFAULT '',
 routine_public TINYINT NOT NULL DEFAULT 0,
 progress_visibility VARCHAR(16) NOT NULL DEFAULT 'private',
 details_public TINYINT NOT NULL DEFAULT 0,
 body_weight_public TINYINT NOT NULL DEFAULT 0,
 ranking_public TINYINT NOT NULL DEFAULT 0,
 trainer_enabled TINYINT NOT NULL DEFAULT 0,
 created BIGINT NOT NULL,
 FOREIGN KEY(user_id) REFERENCES account_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_routines (
 user_id VARCHAR(64) PRIMARY KEY,
 payload MEDIUMTEXT NOT NULL,
 updated VARCHAR(32) NOT NULL,
 FOREIGN KEY(user_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_progress (
 user_id VARCHAR(64) PRIMARY KEY,
 payload MEDIUMTEXT NOT NULL,
 updated VARCHAR(32) NOT NULL,
 FOREIGN KEY(user_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_samples (
 user_id VARCHAR(64) PRIMARY KEY,
 payload MEDIUMTEXT NOT NULL,
 updated BIGINT NOT NULL,
 FOREIGN KEY(user_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_follows (
 follower_id VARCHAR(64) NOT NULL,
 followed_id VARCHAR(64) NOT NULL,
 created BIGINT NOT NULL,
 PRIMARY KEY(follower_id, followed_id),
 FOREIGN KEY(follower_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE,
 FOREIGN KEY(followed_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_notifications (
 id CHAR(32) PRIMARY KEY,
 recipient_id VARCHAR(64) NOT NULL,
 actor_id VARCHAR(64) NOT NULL,
 type VARCHAR(32) NOT NULL,
 created BIGINT NOT NULL,
 read_at BIGINT NULL,
 UNIQUE KEY notification_once(recipient_id, actor_id, type),
 INDEX notification_recipient(recipient_id, read_at, created),
 FOREIGN KEY(recipient_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE,
 FOREIGN KEY(actor_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_blocks (
 user_id VARCHAR(64) NOT NULL,
 blocked_id VARCHAR(64) NOT NULL,
 created BIGINT NOT NULL,
 PRIMARY KEY(user_id, blocked_id),
 FOREIGN KEY(user_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE,
 FOREIGN KEY(blocked_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_posts (
 id CHAR(32) PRIMARY KEY,
 user_id VARCHAR(64) NOT NULL,
 caption VARCHAR(500) NOT NULL DEFAULT '',
 created BIGINT NOT NULL,
 FOREIGN KEY(user_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE,
 INDEX(created), INDEX(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_post_likes (
 post_id CHAR(32) NOT NULL,
 user_id VARCHAR(64) NOT NULL,
 created BIGINT NOT NULL,
 PRIMARY KEY(post_id, user_id),
 FOREIGN KEY(post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
 FOREIGN KEY(user_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_reports (
 id CHAR(32) PRIMARY KEY,
 reporter_id VARCHAR(64) NOT NULL,
 target_type VARCHAR(16) NOT NULL,
 target_id VARCHAR(64) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 created BIGINT NOT NULL,
 INDEX(target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_gyms (
 id CHAR(32) PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 city VARCHAR(120) NOT NULL DEFAULT '',
 created BIGINT NOT NULL,
 UNIQUE KEY gym_name_city(name, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_coaching (
 id CHAR(32) PRIMARY KEY,
 client_id VARCHAR(64) NOT NULL,
 trainer_id VARCHAR(64) NOT NULL,
 status VARCHAR(16) NOT NULL,
 created BIGINT NOT NULL,
 updated BIGINT NOT NULL,
 UNIQUE KEY coaching_pair(client_id, trainer_id),
 FOREIGN KEY(client_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE,
 FOREIGN KEY(trainer_id) REFERENCES community_profiles(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS community_coaching_routines (
 coaching_id CHAR(32) PRIMARY KEY,
 payload MEDIUMTEXT NOT NULL,
 revision INT NOT NULL DEFAULT 1,
 updated BIGINT NOT NULL,
 author_id VARCHAR(64) NOT NULL,
 FOREIGN KEY(coaching_id) REFERENCES community_coaching(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
