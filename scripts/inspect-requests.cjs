const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5433/rsp_db' });

async function check() {
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'rsp' AND table_name = 'users';");
  console.log('Columns in rsp.users:', cols.rows);

  const sample = await pool.query('SELECT * FROM rsp.users LIMIT 2;');
  console.log('Sample user:', sample.rows);

  const roles = await pool.query('SELECT * FROM rsp.roles ORDER BY id ASC;');
  console.log('Roles in rsp.roles:', roles.rows);

  await pool.end();
}
check().catch(console.error);
