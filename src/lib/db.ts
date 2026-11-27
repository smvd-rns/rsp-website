import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5433/rsp_db';

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
  });
} else {
  if (!(global as any)._pgPool) {
    (global as any)._pgPool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });
  }
  pool = (global as any)._pgPool;
}

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export default pool;

