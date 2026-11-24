const { google } = require('googleapis');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// 1. Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'category-images');
const CACHE_FILE = path.join(__dirname, 'drive-image-cache.json');
const TARGET_FOLDER_ID = '1H6cm8f1DFjtnHP17yTuEHe9hu4VGFpHb'; // Images folder

async function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive OAuth credentials missing in .env.local');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function fetchExistingFilesInDrive(drive) {
  console.log(`Checking existing files in Google Drive folder: ${TARGET_FOLDER_ID}...`);
  const existingMap = new Map();
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${TARGET_FOLDER_ID}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name)',
      pageSize: 1000,
      pageToken,
    });
    const files = res.data.files || [];
    for (const f of files) {
      existingMap.set(f.name, f.id);
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  console.log(`Found ${existingMap.size} existing files already in Google Drive Images folder.`);
  return existingMap;
}

async function uploadSingleFileWithRetry(drive, fileName, filePath, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const stream = new Readable({
        read() {
          this.push(fileBuffer);
          this.push(null);
        },
      });

      const res = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [TARGET_FOLDER_ID],
        },
        media: {
          mimeType: 'image/webp',
          body: stream,
        },
        fields: 'id, name',
      });

      const fileId = res.data.id;
      if (!fileId) throw new Error('No fileId returned from Google Drive');

      // Make publicly viewable
      try {
        await drive.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (permErr) {
        // Permissions create might be denied if parent already inherits or rate limited
      }

      return fileId;
    } catch (err) {
      const isRateLimit = err.status === 429 || (err.message && err.message.includes('rateLimitExceeded')) || err.status === 503;
      if (attempt < retries && isRateLimit) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
      } else if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  const drive = await getDriveClient();
  const existingInDrive = await fetchExistingFilesInDrive(drive);

  // Load local cache if exists
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch (e) {
      cache = {};
    }
  }

  // Populate cache with drive files
  for (const [name, id] of existingInDrive.entries()) {
    cache[name] = {
      fileId: id,
      directImageUrl: `https://lh3.googleusercontent.com/d/${id}=s1600`,
    };
  }

  // Get local files to upload
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error('Directory not found:', IMAGES_DIR);
    process.exit(1);
  }

  const allLocalFiles = fs.readdirSync(IMAGES_DIR).filter((f) => f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.jpg'));
  console.log(`Found ${allLocalFiles.length} local images in public/category-images/`);

  const toUpload = allLocalFiles.filter((f) => !cache[f]);
  console.log(`${toUpload.length} images need to be uploaded to Google Drive.`);

  // Upload with concurrency of 6
  const CONCURRENCY = 6;
  let completed = allLocalFiles.length - toUpload.length;
  let failed = 0;

  const saveCache = () => {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  };

  if (toUpload.length > 0) {
    console.log(`Starting upload with concurrency ${CONCURRENCY}...`);
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < toUpload.length) {
        const idx = currentIndex++;
        const fileName = toUpload[idx];
        const filePath = path.join(IMAGES_DIR, fileName);

        try {
          const fileId = await uploadSingleFileWithRetry(drive, fileName, filePath);
          cache[fileName] = {
            fileId,
            directImageUrl: `https://lh3.googleusercontent.com/d/${fileId}=s1600`,
          };
          completed++;
          if (completed % 10 === 0 || completed === allLocalFiles.length) {
            process.stdout.write(`Uploaded ${completed}/${allLocalFiles.length} images...\r`);
            saveCache();
          }
        } catch (err) {
          failed++;
          console.error(`\nFailed to upload ${fileName}:`, err.message);
        }
      }
    };

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      workers.push(worker());
    }
    await Promise.all(workers);
    saveCache();
    console.log(`\nUpload phase complete! Total available in cache: ${Object.keys(cache).length}, Failed: ${failed}`);
  } else {
    console.log('All files are already in Google Drive cache!');
  }

  // Database Update Phase
  console.log('\nConnecting to PostgreSQL database to update category image links...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const categoriesRes = await pool.query('SELECT id, name, img, image_url FROM rsp.categories');
    const categories = categoriesRes.rows;
    console.log(`Found ${categories.length} categories in database.`);

    let updatedCount = 0;
    let alreadyDriveCount = 0;
    let notFoundCount = 0;

    for (const cat of categories) {
      let matchedFile = null;

      // Check current image_url
      if (cat.image_url) {
        if (cat.image_url.includes('googleusercontent.com') || cat.image_url.includes('drive.google.com')) {
          alreadyDriveCount++;
          continue;
        }
        const cleaned = cat.image_url.replace('/category-images/', '').trim();
        if (cache[cleaned]) {
          matchedFile = cache[cleaned];
        }
      }

      // Check img field if not matched
      if (!matchedFile && cat.img) {
        const num = Number(cat.img);
        if (!isNaN(num) && num > 0) {
          const b36 = num.toString(36) + '.webp';
          if (cache[b36]) {
            matchedFile = cache[b36];
          }
        }
        if (!matchedFile && cache[`${cat.img}.webp`]) {
          matchedFile = cache[`${cat.img}.webp`];
        }
      }

      if (matchedFile) {
        await pool.query('UPDATE rsp.categories SET image_url = $1 WHERE id = $2', [
          matchedFile.directImageUrl,
          cat.id,
        ]);
        updatedCount++;
      } else {
        notFoundCount++;
      }
    }

    console.log(`Categories updated with Google Drive links: ${updatedCount}`);
    console.log(`Categories already pointing to Google Drive: ${alreadyDriveCount}`);
    console.log(`Categories with no matching image file: ${notFoundCount}`);

    // Verify sample in database
    const sample = await pool.query(
      `SELECT id, name, img, image_url FROM rsp.categories WHERE image_url LIKE '%googleusercontent%' LIMIT 5;`
    );
    console.log('\nSample categories in DB with Google Drive links:');
    for (const row of sample.rows) {
      console.log(`- [${row.id}] ${row.name} => ${row.image_url}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

