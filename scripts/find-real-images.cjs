const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5433/rsp_db' });

async function main() {
  const r = await pool.query("SELECT count(*) FROM rsp.recordings");
  console.log("Local rsp.recordings count:", r.rows[0].count);
  await pool.end();
}
main().catch(console.error);
