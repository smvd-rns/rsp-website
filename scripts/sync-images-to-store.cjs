const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5433/rsp_db' });

async function syncAll() {
  const cachePath = path.join(__dirname, 'drive-image-cache.json');
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  const fallbackUrl = 'https://lh3.googleusercontent.com/d/1uSfBfVRfVqNdhDJteMuOSYbVdYWEAUUZ=s1600';

  // 1. Update any category that had fallback / NULL to the Google Drive fallback
  const fallbackRes = await pool.query(
    "UPDATE rsp.categories SET image_url = $1 WHERE image_url IS NULL OR image_url = '/rsp.webp' OR image_url LIKE '/category-images/%';",
    [fallbackUrl]
  );
  console.log('Categories updated to Google Drive fallback:', fallbackRes.rowCount);

  // 2. Count categories with googleusercontent
  const check = await pool.query("SELECT count(*) FROM rsp.categories WHERE image_url LIKE '%googleusercontent%';");
  console.log('Total categories with googleusercontent links now:', check.rows[0].count);

  // 3. Generate a SQL dump for the droplet to update categories and images
  console.log('Exporting droplet migration SQL...');
  const catRows = await pool.query("SELECT id, image_url FROM rsp.categories WHERE image_url IS NOT NULL;");
  const imgRows = await pool.query("SELECT id, description, gdrive_id, url FROM rsp.images WHERE gdrive_id IS NOT NULL;");

  let sql = '-- Droplet Category & Image GDrive Sync Migration\nBEGIN;\n';
  for (const c of catRows.rows) {
    const escapedUrl = c.image_url.replace(/'/g, "''");
    sql += `UPDATE rsp.categories SET image_url = '${escapedUrl}' WHERE id = ${c.id};\n`;
  }
  for (const im of imgRows.rows) {
    const desc = (im.description || '').replace(/'/g, "''");
    const gdriveId = im.gdrive_id.replace(/'/g, "''");
    const u = im.url.replace(/'/g, "''");
    sql += `INSERT INTO rsp.images (id, description, gdrive_id, url) VALUES (${im.id}, '${desc}', '${gdriveId}', '${u}') ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, gdrive_id = EXCLUDED.gdrive_id, url = EXCLUDED.url;\n`;
  }
  sql += 'COMMIT;\n';

  fs.writeFileSync(path.join(__dirname, 'update-droplet-categories-and-images.sql'), sql);
  console.log('Successfully wrote scripts/update-droplet-categories-and-images.sql!');

  await pool.end();
}

syncAll().catch(console.error);
