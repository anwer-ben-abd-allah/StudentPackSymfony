-- Tasks table (compatible with StudentPack PHP app)
-- Run against your student_pack database when using MySQL/MariaDB.

CREATE TABLE IF NOT EXISTS tasks (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    priority    VARCHAR(20) NOT NULL DEFAULT 'Moyenne',
    due_date    DATE NULL,
    due_time    TIME NULL,
    is_done     TINYINT(1) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
