const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5433/rsp_db' });

async function main() {
  const tables = await pool.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'rsp' 
      AND (column_name ILIKE '%img%' OR column_name ILIKE '%image%' OR column_name ILIKE '%photo%');
  `);
  console.log("Image columns in rsp schema:", tables.rows);
  await pool.end();
}
main().catch(console.error);
