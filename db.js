// SQLite Database Module — replaces JSON file storage
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync, writeFileSync as fsWriteFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = path.join(DATA_DIR, "mythos.db");

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initTables();
    migrateJsonFiles();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      passwordHash TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      planExpiresAt TEXT,
      lemonCustomerId TEXT,
      lemonSubscriptionId TEXT,
      postsThisMonth INTEGER DEFAULT 0,
      postsResetAt TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      text TEXT DEFAULT '',
      media TEXT DEFAULT '[]',
      platforms TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'draft',
      scheduledAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      postedAt TEXT,
      postResults TEXT
    );

    CREATE TABLE IF NOT EXISTS platform_tokens (
      platform TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      connectedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS scheduler_jobs (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'scheduled',
      content TEXT,
      platforms TEXT DEFAULT '[]',
      scheduledAt TEXT,
      cronExpression TEXT,
      webhookUrl TEXT,
      status TEXT DEFAULT 'scheduled',
      results TEXT,
      createdAt TEXT NOT NULL,
      completedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS scheduler_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      jobId TEXT,
      data TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_status ON scheduler_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_scheduler_log_timestamp ON scheduler_log(timestamp);
  `);
}

// --- JSON Migration: import old JSON files on first run ---

function migrateJsonFiles() {
  const migrationFlag = path.join(DATA_DIR, ".db-migrated");
  if (existsSync(migrationFlag)) return;

  let migrated = false;

  // Migrate users.json
  const usersPath = path.join(__dirname, "users.json");
  if (existsSync(usersPath)) {
    try {
      const users = JSON.parse(readFileSync(usersPath, "utf-8"));
      const insert = db.prepare(`
        INSERT OR IGNORE INTO users (id, email, name, passwordHash, plan, planExpiresAt,
          lemonCustomerId, lemonSubscriptionId, postsThisMonth, postsResetAt, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const tx = db.transaction(() => {
        for (const u of users) {
          insert.run(u.id, u.email, u.name, u.passwordHash, u.plan || "free",
            u.planExpiresAt || null, u.lemonCustomerId || null,
            u.lemonSubscriptionId || null, u.postsThisMonth || 0,
            u.postsResetAt || null, u.createdAt || new Date().toISOString());
        }
      });
      tx();
      console.log(`[DB] Migrated ${users.length} users from users.json`);
      migrated = true;
    } catch (err) {
      console.error("[DB] Failed to migrate users.json:", err.message);
    }
  }

  // Migrate posts.json
  const postsPath = path.join(__dirname, "posts.json");
  if (existsSync(postsPath)) {
    try {
      const posts = JSON.parse(readFileSync(postsPath, "utf-8"));
      const insert = db.prepare(`
        INSERT OR IGNORE INTO posts (id, text, media, platforms, tags, status,
          scheduledAt, createdAt, updatedAt, postedAt, postResults)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const tx = db.transaction(() => {
        for (const p of posts) {
          insert.run(p.id, p.text || "", JSON.stringify(p.media || []),
            JSON.stringify(p.platforms || []), JSON.stringify(p.tags || []),
            p.status || "draft", p.scheduledAt || null,
            p.createdAt || new Date().toISOString(),
            p.updatedAt || new Date().toISOString(),
            p.postedAt || null, p.postResults ? JSON.stringify(p.postResults) : null);
        }
      });
      tx();
      console.log(`[DB] Migrated ${posts.length} posts from posts.json`);
      migrated = true;
    } catch (err) {
      console.error("[DB] Failed to migrate posts.json:", err.message);
    }
  }

  // Migrate platform-tokens.json
  const tokensPath = path.join(__dirname, "platform-tokens.json");
  if (existsSync(tokensPath)) {
    try {
      const tokens = JSON.parse(readFileSync(tokensPath, "utf-8"));
      const insert = db.prepare(`
        INSERT OR IGNORE INTO platform_tokens (platform, data, connectedAt)
        VALUES (?, ?, ?)
      `);
      const tx = db.transaction(() => {
        for (const [platform, data] of Object.entries(tokens)) {
          if (platform.startsWith("_")) continue; // skip internal keys like _x_verifier
          insert.run(platform, JSON.stringify(data), data.connectedAt || null);
        }
        // Also store internal keys
        if (tokens._x_verifier) {
          insert.run("_x_verifier", JSON.stringify({ value: tokens._x_verifier }), null);
        }
      });
      tx();
      console.log(`[DB] Migrated platform tokens from platform-tokens.json`);
      migrated = true;
    } catch (err) {
      console.error("[DB] Failed to migrate platform-tokens.json:", err.message);
    }
  }

  // Migrate scheduled-jobs.json
  const jobsPath = path.join(__dirname, "scheduled-jobs.json");
  if (existsSync(jobsPath)) {
    try {
      const jobs = JSON.parse(readFileSync(jobsPath, "utf-8"));
      const insert = db.prepare(`
        INSERT OR IGNORE INTO scheduler_jobs (id, type, content, platforms, scheduledAt,
          cronExpression, webhookUrl, status, results, createdAt, completedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const tx = db.transaction(() => {
        for (const j of (jobs.scheduled || [])) {
          insert.run(j.id, "scheduled", j.content || "", JSON.stringify(j.platforms || []),
            j.scheduledAt || null, null, j.webhookUrl || null, j.status || "scheduled",
            j.results ? JSON.stringify(j.results) : null,
            j.createdAt || new Date().toISOString(), j.completedAt || null);
        }
        for (const j of (jobs.active || [])) {
          insert.run(j.id, "recurring", j.content || "", JSON.stringify(j.platforms || []),
            null, j.cronExpression || null, j.webhookUrl || null, j.status || "active",
            null, j.createdAt || new Date().toISOString(), null);
        }
      });
      tx();
      console.log(`[DB] Migrated scheduler jobs from scheduled-jobs.json`);
      migrated = true;
    } catch (err) {
      console.error("[DB] Failed to migrate scheduled-jobs.json:", err.message);
    }
  }

  // Migrate job-log.json
  const logPath = path.join(__dirname, "job-log.json");
  if (existsSync(logPath)) {
    try {
      const log = JSON.parse(readFileSync(logPath, "utf-8"));
      const insert = db.prepare(`
        INSERT INTO scheduler_log (type, jobId, data, timestamp)
        VALUES (?, ?, ?, ?)
      `);
      const tx = db.transaction(() => {
        for (const entry of log) {
          const { type, jobId, timestamp, ...rest } = entry;
          insert.run(type || "unknown", jobId || null, JSON.stringify(rest),
            timestamp || new Date().toISOString());
        }
      });
      tx();
      console.log(`[DB] Migrated ${log.length} log entries from job-log.json`);
      migrated = true;
    } catch (err) {
      console.error("[DB] Failed to migrate job-log.json:", err.message);
    }
  }

  // Write migration flag
  if (migrated) {
    try {
      fsWriteFileSync(migrationFlag, new Date().toISOString());
    } catch {
      // non-critical
    }
  }
}

// --- User operations ---

export function dbGetAllUsers() {
  return getDb().prepare("SELECT * FROM users").all();
}

export function dbFindUserByEmail(email) {
  return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
}

export function dbFindUserById(id) {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export function dbFindUserByLemonCustomerId(customerId) {
  return getDb().prepare("SELECT * FROM users WHERE lemonCustomerId = ?").get(customerId);
}

export function dbInsertUser(user) {
  getDb().prepare(`
    INSERT INTO users (id, email, name, passwordHash, plan, planExpiresAt,
      lemonCustomerId, lemonSubscriptionId, postsThisMonth, postsResetAt, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, user.email, user.name, user.passwordHash, user.plan || "free",
    user.planExpiresAt || null, user.lemonCustomerId || null,
    user.lemonSubscriptionId || null, user.postsThisMonth || 0,
    user.postsResetAt || null, user.createdAt);
}

export function dbUpdateUser(id, updates) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

// --- Post operations ---

export function dbGetAllPosts() {
  const rows = getDb().prepare("SELECT * FROM posts ORDER BY createdAt DESC").all();
  return rows.map(deserializePost);
}

export function dbGetPostById(id) {
  const row = getDb().prepare("SELECT * FROM posts WHERE id = ?").get(id);
  return row ? deserializePost(row) : null;
}

export function dbGetPostsByStatus(status) {
  const rows = getDb().prepare("SELECT * FROM posts WHERE status = ? ORDER BY createdAt DESC").all(status);
  return rows.map(deserializePost);
}

export function dbInsertPost(post) {
  getDb().prepare(`
    INSERT INTO posts (id, text, media, platforms, tags, status, scheduledAt,
      createdAt, updatedAt, postedAt, postResults)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(post.id, post.text, JSON.stringify(post.media || []),
    JSON.stringify(post.platforms || []), JSON.stringify(post.tags || []),
    post.status || "draft", post.scheduledAt || null,
    post.createdAt, post.updatedAt, post.postedAt || null,
    post.postResults ? JSON.stringify(post.postResults) : null);
}

export function dbUpdatePost(id, updates) {
  const serialized = {};
  for (const [key, value] of Object.entries(updates)) {
    if (["media", "platforms", "tags", "postResults"].includes(key) && value !== null && typeof value === "object") {
      serialized[key] = JSON.stringify(value);
    } else {
      serialized[key] = value;
    }
  }
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(serialized)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function dbDeletePost(id) {
  getDb().prepare("DELETE FROM posts WHERE id = ?").run(id);
}

function deserializePost(row) {
  return {
    ...row,
    media: JSON.parse(row.media || "[]"),
    platforms: JSON.parse(row.platforms || "[]"),
    tags: JSON.parse(row.tags || "[]"),
    postResults: row.postResults ? JSON.parse(row.postResults) : null,
  };
}

// --- Platform token operations ---

export function dbGetAllTokens() {
  const rows = getDb().prepare("SELECT * FROM platform_tokens").all();
  const tokens = {};
  for (const row of rows) {
    if (row.platform === "_x_verifier") {
      tokens._x_verifier = JSON.parse(row.data).value;
    } else {
      tokens[row.platform] = JSON.parse(row.data);
    }
  }
  return tokens;
}

export function dbGetToken(platform) {
  const row = getDb().prepare("SELECT * FROM platform_tokens WHERE platform = ?").get(platform);
  if (!row) return null;
  if (platform === "_x_verifier") return JSON.parse(row.data).value;
  return JSON.parse(row.data);
}

export function dbSaveToken(platform, data) {
  const serialized = platform === "_x_verifier"
    ? JSON.stringify({ value: data })
    : JSON.stringify(data);
  const connectedAt = (typeof data === "object" && data !== null) ? (data.connectedAt || new Date().toISOString()) : null;
  getDb().prepare(`
    INSERT OR REPLACE INTO platform_tokens (platform, data, connectedAt)
    VALUES (?, ?, ?)
  `).run(platform, serialized, connectedAt);
}

export function dbRemoveToken(platform) {
  getDb().prepare("DELETE FROM platform_tokens WHERE platform = ?").run(platform);
}

// --- Scheduler operations ---

export function dbGetSchedulerJobs() {
  const scheduled = getDb().prepare("SELECT * FROM scheduler_jobs WHERE type = 'scheduled' ORDER BY createdAt DESC LIMIT 50").all();
  const active = getDb().prepare("SELECT * FROM scheduler_jobs WHERE type = 'recurring'").all();
  return {
    scheduled: scheduled.map(deserializeJob),
    active: active.map(deserializeJob),
  };
}

export function dbInsertJob(job) {
  getDb().prepare(`
    INSERT OR REPLACE INTO scheduler_jobs (id, type, content, platforms, scheduledAt,
      cronExpression, webhookUrl, status, results, createdAt, completedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(job.id, job.type || "scheduled", job.content || "",
    JSON.stringify(job.platforms || []), job.scheduledAt || null,
    job.cronExpression || null, job.webhookUrl || null, job.status || "scheduled",
    job.results ? JSON.stringify(job.results) : null,
    job.createdAt || new Date().toISOString(), job.completedAt || null);
}

export function dbUpdateJob(id, updates) {
  const serialized = {};
  for (const [key, value] of Object.entries(updates)) {
    if (["platforms", "results"].includes(key) && value !== null && typeof value === "object") {
      serialized[key] = JSON.stringify(value);
    } else {
      serialized[key] = value;
    }
  }
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(serialized)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return;
  values.push(id);
  getDb().prepare(`UPDATE scheduler_jobs SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

function deserializeJob(row) {
  return {
    ...row,
    platforms: JSON.parse(row.platforms || "[]"),
    results: row.results ? JSON.parse(row.results) : null,
  };
}

// --- Scheduler log operations ---

export function dbAddLog(entry) {
  const { type, jobId, timestamp, ...rest } = entry;
  getDb().prepare(`
    INSERT INTO scheduler_log (type, jobId, data, timestamp)
    VALUES (?, ?, ?, ?)
  `).run(type || "unknown", jobId || null, JSON.stringify(rest),
    timestamp || new Date().toISOString());

  // Keep only last 500 entries
  getDb().prepare(`
    DELETE FROM scheduler_log WHERE id NOT IN (
      SELECT id FROM scheduler_log ORDER BY id DESC LIMIT 500
    )
  `).run();
}

export function dbGetLog(limit = 200) {
  const rows = getDb().prepare("SELECT * FROM scheduler_log ORDER BY id DESC LIMIT ?").all(limit);
  return rows.map(row => ({
    type: row.type,
    jobId: row.jobId,
    ...JSON.parse(row.data || "{}"),
    timestamp: row.timestamp,
  }));
}

// --- Health check ---

export function dbHealthCheck() {
  try {
    getDb().prepare("SELECT 1").get();
    return { connected: true, path: DB_PATH };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

// --- Graceful shutdown ---

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
