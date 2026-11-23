import pool from "../src/lib/db.ts";

async function createSiteVisitsTable() {
  console.log("Creating rsp.site_visits table if not exists...");
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS rsp;

    CREATE TABLE IF NOT EXISTS rsp.site_visits (
      id BIGSERIAL PRIMARY KEY,
      visitor_id VARCHAR(64) NOT NULL,
      user_id BIGINT REFERENCES rsp.users(id) ON DELETE SET NULL,
      user_email VARCHAR(255),
      user_role VARCHAR(100),
      is_logged_in BOOLEAN NOT NULL DEFAULT FALSE,
      page_path VARCHAR(255) NOT NULL,
      page_title VARCHAR(255),
      referrer VARCHAR(500),
      utm_source VARCHAR(100),
      utm_medium VARCHAR(100),
      utm_campaign VARCHAR(100),
      ip_hash VARCHAR(64),
      device_type VARCHAR(32) DEFAULT 'desktop',
      browser VARCHAR(64),
      os VARCHAR(64),
      is_bot BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON rsp.site_visits(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_site_visits_visitor_id ON rsp.site_visits(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_site_visits_is_logged_in ON rsp.site_visits(is_logged_in);
    CREATE INDEX IF NOT EXISTS idx_site_visits_page_path ON rsp.site_visits(page_path);
    CREATE INDEX IF NOT EXISTS idx_site_visits_user_id ON rsp.site_visits(user_id);
  `);

  console.log("rsp.site_visits table and indexes created successfully!");
  process.exit(0);
}

createSiteVisitsTable().catch((err) => {
  console.error("Failed to create site_visits table:", err);
  process.exit(1);
});
