import Database from 'better-sqlite3'

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      address TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      subscription_price_luna INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      valid_read_count INTEGER NOT NULL DEFAULT 0,
      tips_sent_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      word_count INTEGER NOT NULL DEFAULT 0,
      read_time_minutes INTEGER NOT NULL DEFAULT 1,
      quiz_json TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'hidden')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      total_tips_luna INTEGER NOT NULL DEFAULT 0,
      verified_read_count INTEGER NOT NULL DEFAULT 0,
      access_type TEXT NOT NULL DEFAULT 'free' CHECK(access_type IN ('free', 'subscription', 'one_time')),
      price_luna INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS read_sessions (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL REFERENCES articles(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      device_hash TEXT NOT NULL DEFAULT '',
      ip_hash TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      checkpoints TEXT NOT NULL DEFAULT '[]',
      checkpoint_times TEXT NOT NULL DEFAULT '[]',
      quiz_passed INTEGER,
      valid INTEGER,
      reject_reason TEXT,
      weight REAL NOT NULL DEFAULT 0,
      expired INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tips (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL REFERENCES articles(id),
      sender_id TEXT NOT NULL REFERENCES users(id),
      recipient_id TEXT NOT NULL REFERENCES users(id),
      amount_luna INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      tx_hash TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'failed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL REFERENCES users(id),
      topic TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      budget_luna INTEGER NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_review', 'awarded', 'paid', 'expired')),
      winner_id TEXT REFERENCES users(id),
      tx_hash TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      awarded_at TEXT
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES requests(id),
      article_id TEXT NOT NULL REFERENCES articles(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(request_id, author_id)
    );

    CREATE TABLE IF NOT EXISTS pools (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      total_luna INTEGER NOT NULL,
      sponsor TEXT NOT NULL DEFAULT 'Demo Labs',
      distributed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL REFERENCES pools(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      amount_luna INTEGER NOT NULL,
      score REAL NOT NULL DEFAULT 0,
      tx_hash TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'failed')),
      payout_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS access_payments (
      id TEXT PRIMARY KEY,
      tx_hash TEXT UNIQUE NOT NULL,
      buyer_id TEXT NOT NULL REFERENCES users(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      article_id TEXT REFERENCES articles(id),
      purpose TEXT NOT NULL CHECK(purpose IN ('subscription', 'article')),
      amount_luna INTEGER NOT NULL,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('tip', 'subscription', 'article_purchase')),
      actor_id TEXT NOT NULL REFERENCES users(id),
      article_id TEXT,
      amount_luna INTEGER NOT NULL,
      tx_hash TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL CHECK(target_type IN ('article', 'request')),
      target_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL CHECK(reason IN ('illegal', 'hateful', 'sexual', 'scam', 'plagiarism', 'other')),
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'hidden', 'restored')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS demo_accounts (
      address TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      balance_luna INTEGER NOT NULL DEFAULT 0,
      faucet_uses_today INTEGER NOT NULL DEFAULT 0,
      faucet_last_date TEXT
    );

    CREATE TABLE IF NOT EXISTS demo_transactions (
      id TEXT PRIMARY KEY,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      value_luna INTEGER NOT NULL,
      data TEXT,
      tx_hash TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'failed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS demo_stakes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      validator_id TEXT NOT NULL,
      amount_luna INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'deactivating', 'retired', 'removed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      rewards_luna INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS validators (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT UNIQUE NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      payout_type TEXT NOT NULL DEFAULT 'restake' CHECK(payout_type IN ('restake', 'direct')),
      trust_score REAL NOT NULL DEFAULT 0.5
    );

    CREATE TABLE IF NOT EXISTS nonces (
      nonce TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS demo_time_offset (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      offset_seconds INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO demo_time_offset (id, offset_seconds) VALUES (1, 0);

    CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id);
    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
    CREATE INDEX IF NOT EXISTS idx_tips_article ON tips(article_id);
    CREATE INDEX IF NOT EXISTS idx_tips_recipient ON tips(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_read_sessions_article ON read_sessions(article_id);
    CREATE INDEX IF NOT EXISTS idx_read_sessions_user ON read_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_request ON submissions(request_id);
    CREATE INDEX IF NOT EXISTS idx_payouts_pool ON payouts(pool_id);
    CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
  `)

  // Add columns for existing local SQLite databases created before monetization.
  const userColumns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>
  if (!userColumns.some((column) => column.name === 'subscription_price_luna')) {
    db.exec('ALTER TABLE users ADD COLUMN subscription_price_luna INTEGER NOT NULL DEFAULT 0')
  }
  const articleColumns = db.prepare('PRAGMA table_info(articles)').all() as Array<{ name: string }>
  if (!articleColumns.some((column) => column.name === 'access_type')) {
    db.exec("ALTER TABLE articles ADD COLUMN access_type TEXT NOT NULL DEFAULT 'free'")
  }
  if (!articleColumns.some((column) => column.name === 'price_luna')) {
    db.exec('ALTER TABLE articles ADD COLUMN price_luna INTEGER NOT NULL DEFAULT 0')
  }

  return db
}
