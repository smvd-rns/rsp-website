const fs = require('fs');
const path = require('path');
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'category-images');

async function downloadImages() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Fetching list of files from Supabase Storage "images" bucket...');
  let offset = 0;
  let allFiles = [];

  while (true) {
    const { data: files, error } = await supabase.storage.from('images').list('', { limit: 1000, offset });
    if (error) {
      console.error('Error listing files:', error);
      break;
    }
    if (!files || files.length === 0) break;
    allFiles = allFiles.concat(files);
    offset += files.length;
    if (files.length < 1000) break;
  }

  // Filter webp files (excluding -2x variants to save space and keep it standard)
  const webpFiles = allFiles.filter(f => f.name.endsWith('.webp') && !f.name.includes('-2x'));
  console.log(`Found ${allFiles.length} total files. Downloading ${webpFiles.length} standard webp images...`);

  let downloaded = 0;
  for (const file of webpFiles) {
    const localPath = path.join(OUTPUT_DIR, file.name);
    if (fs.existsSync(localPath)) {
      downloaded++;
      continue;
    }

    const { data, error } = await supabase.storage.from('images').download(file.name);
    if (error) {
      console.error(`Failed to download ${file.name}:`, error.message);
      continue;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(localPath, buffer);
    downloaded++;
    process.stdout.write(`Downloaded ${downloaded} / ${webpFiles.length} images...\r`);
  }
  console.log(`\nSuccessfully downloaded all ${downloaded} category images into public/category-images!`);

  // Connect to local PostgreSQL and add image_url column to categories
  console.log('Updating local PostgreSQL rsp.categories table with direct image_url...');
  const client = await localPool.connect();
  try {
    await client.query(`
      ALTER TABLE rsp.categories ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);

    // Map each category's img field to its corresponding downloaded image
    const updateResult = await client.query(`
      UPDATE rsp.categories 
      SET image_url = '/category-images/' || img || '.webp'
      WHERE img IS NOT NULL AND img != '';
    `);

    console.log(`Updated ${updateResult.rowCount} categories with their direct image_url!`);

    // Verify a sample
    const sample = await client.query(`
      SELECT id, name, img, image_url 
      FROM rsp.categories 
      WHERE image_url IS NOT NULL 
      LIMIT 5;
    `);
    console.log('Sample updated categories:', sample.rows);
  } finally {
    client.release();
    await localPool.end();
  }
}

downloadImages();

