const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5433/rsp_db' });

async function fixImages() {
  const cats = await pool.query('SELECT id, name, img FROM rsp.categories WHERE img IS NOT NULL AND img > 0;');
  console.log('Total categories with img:', cats.rows.length);

  let updated = 0;
  let missingFiles = 0;

  for (const cat of cats.rows) {
    const num = Number(cat.img);
    const b36 = num.toString(36);
    const filename = b36 + '.webp';
    const filePath = 'public/category-images/' + filename;

    if (fs.existsSync(filePath)) {
      const imgUrl = '/category-images/' + filename;
      await pool.query('UPDATE rsp.categories SET image_url = $1 WHERE id = $2', [imgUrl, cat.id]);
      updated++;
    } else {
      missingFiles++;
    }
  }

  console.log(`Successfully mapped ${updated} categories to verified artwork files!`);
  console.log(`Categories with missing image file: ${missingFiles}`);

  const sample = await pool.query('SELECT id, name, img, image_url FROM rsp.categories WHERE parentid IS NULL ORDER BY orderind ASC LIMIT 12;');
  console.log('\nUpdated Root Categories:');
  for (const row of sample.rows) {
    console.log(` - ${row.name} (img: ${row.img}) => ${row.image_url}`);
  }

  await pool.end();
}

fixImages().catch(err => {
  console.error(err);
  process.exit(1);
});

