const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5433/rsp_db' });

async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rsp.user_edit_requests (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      ashram TEXT,
      temple TEXT,
      purpose TEXT,
      authority_name TEXT,
      authority_email TEXT,
      authority_relationship TEXT,
      requested_role_id BIGINT,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      review_comment TEXT,
      reviewed_at TIMESTAMPTZ,
      reviewed_by TEXT,
      requested_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_user_edit_requests_user_id ON rsp.user_edit_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_edit_requests_status ON rsp.user_edit_requests(status);
  `);
  console.log('Successfully created rsp.user_edit_requests table and indexes!');
  await pool.end();
}

createTable().catch(console.error);

