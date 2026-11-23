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

const TABLES = [
  'roles',
  'services',
  'events',
  'images',
  'speciallinks',
  'users',
  'categories',
  'recordings',
  'materials',
  'm4'
];

async function inferAndCreateTable(client, tableName, sampleRow) {
  if (!sampleRow) return;
  const cols = [];
  for (const [key, val] of Object.entries(sampleRow)) {
    let type = 'TEXT';
    if (typeof val === 'number') {
      type = Number.isInteger(val) ? 'BIGINT' : 'NUMERIC';
    } else if (typeof val === 'boolean') {
      type = 'BOOLEAN';
    } else if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(val))) {
      type = 'TIMESTAMP';
    }
    cols.push(`"${key}" ${type}`);
  }

  // Create table if not exists
  const createSql = `
    CREATE TABLE IF NOT EXISTS rsp."${tableName}" (
      ${cols.join(',\n      ')}
    );
  `;
  await client.query(createSql);
}

async function copyTable(client, tableName) {
  console.log(`\n========================================`);
  console.log(`Processing table: rsp.${tableName}`);
  console.log(`========================================`);

  // Get total count
  const { count, error: countErr } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
  if (countErr) {
    console.error(`Failed to get count for ${tableName}:`, countErr.message);
    return;
  }
  console.log(`Total rows in Supabase: ${count}`);

  if (count === 0) {
    console.log(`Table is empty. Skipping.`);
    return;
  }

  // Fetch sample row to create table structure if needed
  const { data: sampleData } = await supabase.from(tableName).select('*').limit(1);
  if (sampleData && sampleData.length > 0) {
    await inferAndCreateTable(client, tableName, sampleData[0]);
  }

  // Truncate existing local table to ensure fresh copy
  await client.query(`TRUNCATE TABLE rsp."${tableName}" CASCADE;`);

  // Paginate through Supabase
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

    // Insert into local DB
    const keys = Object.keys(data[0]);
    const colList = keys.map(k => `"${k}"`).join(', ');

    // Use transaction for batch insert
    await client.query('BEGIN');
    try {
      for (const row of data) {
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => row[k]);
        await client.query(
          `INSERT INTO rsp."${tableName}" (${colList}) VALUES (${placeholders});`,
          values
        );
      }
      await client.query('COMMIT');
    } catch (insertErr) {
      await client.query('ROLLBACK');
      console.error(`Error inserting batch for ${tableName}:`, insertErr.message);
      break;
    }

    copied += data.length;
    process.stdout.write(`Copied ${copied} / ${count} rows...\r`);
  }

  console.log(`Done! Successfully copied ${copied} rows into rsp.${tableName}.`);
}

async function run() {
  console.log('Connecting to local PostgreSQL at localhost:5433/rsp_db...');
  const client = await localPool.connect();
  console.log('Connected to local PostgreSQL successfully!');

  // Ensure rsp schema exists
  await client.query('CREATE SCHEMA IF NOT EXISTS rsp;');

  try {
    for (const table of TABLES) {
      await copyTable(client, table);
    }
    console.log('\n========================================');
    console.log('ALL TABLES COPIED SUCCESSFULLY TO LOCAL DB!');
    console.log('========================================');
  } catch (err) {
    console.error('Fatal error during copy:', err);
  } finally {
    client.release();
    await localPool.end();
  }
}

run();

