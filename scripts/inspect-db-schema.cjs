const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5433/rsp_db' });

async function main() {
  const r = await pool.query("SELECT id, name, img, image_url, path FROM rsp.categories WHERE image_url IS NOT NULL LIMIT 20");
  console.log("Sample categories with image_url:", r.rows);
  await pool.end();
}
main().catch(console.error);
