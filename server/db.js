import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), 'data', 'bottlerock.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

// WAL mode: concurrent readers + one writer, no blocking.
db.pragma('journal_mode = WAL');
// NORMAL sync is safe with WAL — only risks data loss on OS crash, not DB corruption.
db.pragma('synchronous = NORMAL');
// 16 MB in-process page cache.
db.pragma('cache_size = -16000');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL,
    last_active INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS members (
    group_id    TEXT    NOT NULL REFERENCES groups(id),
    member_key  TEXT    NOT NULL,
    display_name TEXT   NOT NULL,
    joined_at   INTEGER NOT NULL,
    last_seen   INTEGER NOT NULL,
    PRIMARY KEY (group_id, member_key)
  );

  CREATE TABLE IF NOT EXISTS votes (
    group_id   TEXT    NOT NULL,
    member_key TEXT    NOT NULL,
    artist_id  TEXT    NOT NULL,
    score      INTEGER NOT NULL CHECK(score IN (1, 3)),
    PRIMARY KEY (group_id, member_key, artist_id),
    FOREIGN KEY (group_id, member_key) REFERENCES members(group_id, member_key)
  );

  CREATE INDEX IF NOT EXISTS idx_votes_group ON votes(group_id);
  CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
  CREATE INDEX IF NOT EXISTS idx_groups_last_active ON groups(last_active);
`);

// Remove groups that have had no activity for 90 days.
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function pruneStaleGroups() {
  const cutoff = Date.now() - NINETY_DAYS_MS;
  const stale = db.prepare('SELECT id FROM groups WHERE last_active < ?').all(cutoff);
  if (!stale.length) return;

  const delVotes   = db.prepare('DELETE FROM votes   WHERE group_id = ?');
  const delMembers = db.prepare('DELETE FROM members WHERE group_id = ?');
  const delGroup   = db.prepare('DELETE FROM groups  WHERE id = ?');

  db.transaction((rows) => {
    for (const { id } of rows) {
      delVotes.run(id);
      delMembers.run(id);
      delGroup.run(id);
    }
  })(stale);

  console.log(`[db] pruned ${stale.length} stale group(s)`);
}

pruneStaleGroups();
setInterval(pruneStaleGroups, 6 * 60 * 60 * 1000).unref(); // every 6 hours, non-blocking

console.log(`[db] SQLite open at ${DB_PATH}`);
