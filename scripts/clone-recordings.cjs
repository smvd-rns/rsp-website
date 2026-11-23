const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bfiyqzcnmkpczkmgounm.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

const localPool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'rsp_db',
  user: 'postgres',
  password: 'postgres',
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  db: { schema: 'rsp' }
});

async function copyRecordings() {
  const client = await localPool.connect();
  const tableName = 'recordings';
  console.log(`Copying all rows for rsp.${tableName}...`);

  const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
  console.log(`Total rows in Supabase: ${count}`);

  await client.query(`TRUNCATE TABLE rsp."${tableName}" CASCADE;`);

  const PAGE_SIZE = 1000;
  let copied = 0;

  for (let from = 0; from < count; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE - 1, count - 1);
    const { data, error } = await supabase.from(tableName).select('*').range(from, to);

    if (error) {
      console.error(`Error fetching range ${from}-${to}:`, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    const keys = Object.keys(data[0]);
    const colList = keys.map(k => `"${k}"`).join(', ');

    await client.query('BEGIN');
    try {
      for (const row of data) {
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => {
          let val = row[k];
          // Convert empty strings to null for timestamp / numeric compatibility
          if (val === '') return null;
          return val;
        });
        await client.query(
          `INSERT INTO rsp."${tableName}" (${colList}) VALUES (${placeholders});`,
          values
        );
      }
      await client.query('COMMIT');
    } catch (insertErr) {
      await client.query('ROLLBACK');
      console.error(`Error inserting batch ${from}-${to}:`, insertErr.message);
      break;
    }

    copied += data.length;
    process.stdout.write(`Copied ${copied} / ${count} rows...\r`);
  }

  console.log(`\nDone! Successfully copied ${copied} / ${count} rows into rsp.${tableName}.`);
  client.release();
  await localPool.end();
}

copyRecordings();

