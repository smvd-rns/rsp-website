const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/rsp_db' });

async function main() {
  const recCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'rsp' AND table_name = 'recordings';
  `);
  console.log('Recordings cols:', recCols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

  const sample = await pool.query('SELECT * FROM rsp.recordings LIMIT 2;');
  console.log('Sample recording:', sample.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
