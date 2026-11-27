/**
 * Safe Non-Destructive Delta Sync from Supabase to PostgreSQL (Droplet / Local)
 * 
 * Guarantees:
 * 1. ZERO DELETIONS: Never drops, truncates, or deletes any rows.
 * 2. UPSERT: Uses INSERT ... ON CONFLICT (id) DO UPDATE.
 * 3. CATEGORY IMAGES: Fetches latest images from Supabase prod.images,
 *    maps Google Drive webp/avif IDs to direct CDN links (lh3.googleusercontent.com/d/<id>=s1600),
 *    and updates rsp.categories.image_url accordingly.
 * 4. ALLOWED ROLES: Syncs role permissions for categories, recordings, and materials.
 */

const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bfiyqzcnmkpczkmgounm.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

const TARGET_DB_URL =
  process.env.TARGET_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/rsp_db';

const pool = new Pool({ connectionString: TARGET_DB_URL });
const sbProd = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { db: { schema: 'prod' } });

// Load local cache fallback if present
let driveImageCache = {};
const cachePath = path.join(__dirname, 'drive-image-cache.json');
if (fs.existsSync(cachePath)) {
  try {
    driveImageCache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  } catch (e) {}
}

async function runSafeSync() {
  const client = await pool.connect();
  console.log(`\n======================================================`);
  console.log(` Connected to Target Database: ${TARGET_DB_URL.replace(/:[^:@]+@/, ':***@')}`);
  console.log(` Zero Deletion Guarantee: ON (UPSERT ONLY)`);
  console.log(` Live Category Image CDN Resolution: ON`);
  console.log(`======================================================\n`);

  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS rsp;');

    // ----------------------------------------------------
    // 1. Fetch and Sync Image Metadata (prod.images -> rsp.images)
    // ----------------------------------------------------
    console.log('--> [1/6] Fetching images from Supabase prod.images...');
    const { data: imagesData, error: imgErr } = await sbProd.from('images').select('*');
    if (imgErr) {
      console.warn('Warning: Could not fetch prod.images:', imgErr.message);
    }
    const cdnImageMap = new Map();
    if (imagesData) {
      for (const img of imagesData) {
        const driveId = img.webp || img.webp_2x || img.avif;
        if (driveId) {
          cdnImageMap.set(Number(img.id), `https://lh3.googleusercontent.com/d/${driveId}=s1600`);
        }
      }
    }
    console.log(`Loaded ${cdnImageMap.size} direct Google Drive CDN images from Supabase.`);

    // Ensure columns exist on rsp.images
    await client.query(`
      CREATE TABLE IF NOT EXISTS rsp.images (
        id BIGINT PRIMARY KEY,
        description TEXT,
        gdrive_id TEXT,
        url TEXT
      );
      ALTER TABLE rsp.images ADD COLUMN IF NOT EXISTS avif TEXT;
      ALTER TABLE rsp.images ADD COLUMN IF NOT EXISTS webp TEXT;
      ALTER TABLE rsp.images ADD COLUMN IF NOT EXISTS avif_2x TEXT;
      ALTER TABLE rsp.images ADD COLUMN IF NOT EXISTS webp_2x TEXT;
      ALTER TABLE rsp.images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rsp_images_id ON rsp.images (id);
    `);

    if (imagesData && imagesData.length > 0) {
      for (const img of imagesData) {
        const driveId = img.webp || img.webp_2x || img.avif || null;
        const cdnUrl = driveId ? `https://lh3.googleusercontent.com/d/${driveId}=s1600` : null;
        await client.query(
          `INSERT INTO rsp.images (id, description, gdrive_id, url, avif, webp, avif_2x, webp_2x, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             description = EXCLUDED.description,
             gdrive_id = COALESCE(EXCLUDED.gdrive_id, rsp.images.gdrive_id),
             url = COALESCE(EXCLUDED.url, rsp.images.url),
             avif = EXCLUDED.avif,
             webp = EXCLUDED.webp,
             avif_2x = EXCLUDED.avif_2x,
             webp_2x = EXCLUDED.webp_2x,
             updated_at = EXCLUDED.updated_at;`,
          [
            img.id,
            img.description,
            driveId,
            cdnUrl,
            img.avif || null,
            img.webp || null,
            img.avif_2x || null,
            img.webp_2x || null,
            img.updated_at ? new Date(img.updated_at) : null,
          ]
        );
      }
      console.log(`✓ Upserted ${imagesData.length} image records into rsp.images.`);
    }

    // ----------------------------------------------------
    // 2. Fetch Lookup Maps (Speakers, Venues, Languages, Events)
    // ----------------------------------------------------
    console.log('\n--> [2/6] Fetching lookup tables from Supabase prod schema...');
    const { data: speakersData } = await sbProd.from('speakers').select('id, name');
    const { data: venuesData } = await sbProd.from('venues').select('id, name');
    const { data: languagesData } = await sbProd.from('languages').select('id, name');
    const { data: eventsData } = await sbProd.from('events').select('id, name, short_name');

    const speakerMap = new Map((speakersData || []).map((s) => [s.id, s.name]));
    const venueMap = new Map((venuesData || []).map((v) => [v.id, v.name]));
    const langMap = new Map((languagesData || []).map((l) => [l.id, l.name]));

    await client.query(`
      CREATE TABLE IF NOT EXISTS rsp.events (
        id BIGINT PRIMARY KEY,
        name TEXT,
        shortname TEXT
      );
    `);
    for (const e of eventsData || []) {
      await client.query(
        `INSERT INTO rsp.events (id, name, shortname)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           shortname = EXCLUDED.shortname;`,
        [e.id, e.name, e.short_name]
      );
    }
    console.log(`✓ Upserted ${(eventsData || []).length} events into rsp.events.`);

    // ----------------------------------------------------
    // 3. Sync Categories with Updated Category Images
    // ----------------------------------------------------
    console.log('\n--> [3/6] Fetching all categories from Supabase prod.categories...');
    let allCategories = [];
    const CAT_PAGE = 1000;
    for (let from = 0; ; from += CAT_PAGE) {
      const { data, error } = await sbProd.from('categories').select('*').range(from, from + CAT_PAGE - 1);
      if (error) {
        console.error('Error fetching categories from prod:', error.message);
        break;
      }
      if (!data || data.length === 0) break;
      allCategories = allCategories.concat(data);
      if (data.length < CAT_PAGE) break;
    }
    console.log(`Fetched ${allCategories.length} categories from Supabase.`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rsp.categories (
        id BIGINT PRIMARY KEY,
        name TEXT NOT NULL,
        img BIGINT,
        path TEXT,
        orderind BIGINT,
        parentid BIGINT,
        gdriveid TEXT,
        videogdriveid TEXT,
        access TEXT,
        comment TEXT,
        image_url TEXT,
        url_path TEXT,
        allowed_roles INTEGER[] DEFAULT '{0}'
      );
      ALTER TABLE rsp.categories ADD COLUMN IF NOT EXISTS allowed_roles INTEGER[] DEFAULT '{0}';
      CREATE INDEX IF NOT EXISTS idx_categories_url_path ON rsp.categories (url_path);
      CREATE INDEX IF NOT EXISTS idx_categories_parentid ON rsp.categories (parentid);
    `);

    // Fetch existing categories to check differences
    const existingCatsRes = await client.query('SELECT id, image_url FROM rsp.categories;');
    const existingImageMap = new Map(existingCatsRes.rows.map((r) => [Number(r.id), r.image_url]));

    let catInserted = 0;
    let catUpdated = 0;
    let imagesUpdated = 0;

    for (const c of allCategories) {
      let parentId = null;
      if (c.path && c.path.trim()) {
        const segments = c.path.split('.').filter(Boolean);
        if (segments.length > 0) {
          parentId = Number(segments[segments.length - 1]);
        }
      }

      // Resolve category image
      const existingImg = existingImageMap.get(Number(c.id));
      let imageUrl = null;
      if (c.img_id) {
        const num = Number(c.img_id);
        // 1. Direct CDN link from prod.images webp
        if (cdnImageMap.has(num)) {
          imageUrl = cdnImageMap.get(num);
        } else {
          // 2. Base36 fallback or cache
          const b36 = num.toString(36) + '.webp';
          if (driveImageCache[b36]?.directImageUrl) {
            imageUrl = driveImageCache[b36].directImageUrl;
          } else if (driveImageCache[`${num}.webp`]?.directImageUrl) {
            imageUrl = driveImageCache[`${num}.webp`].directImageUrl;
          } else {
            imageUrl = `/category-images/${b36}`;
          }
        }
      }

      // If no new image found, preserve existing
      if (!imageUrl && existingImageMap.has(Number(c.id))) {
        imageUrl = existingImageMap.get(Number(c.id));
      }
      if (!imageUrl) {
        imageUrl = '/rsp.webp';
      }

      const res = await client.query(
        `INSERT INTO rsp.categories (
           id, name, img, path, orderind, parentid, image_url, url_path, allowed_roles
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           img = EXCLUDED.img,
           path = EXCLUDED.path,
           orderind = EXCLUDED.orderind,
           parentid = EXCLUDED.parentid,
           url_path = COALESCE(EXCLUDED.url_path, rsp.categories.url_path),
           image_url = EXCLUDED.image_url,
           allowed_roles = COALESCE(EXCLUDED.allowed_roles, rsp.categories.allowed_roles)
         RETURNING (xmax = 0) AS is_inserted;`,
        [
          c.id,
          c.name,
          c.img_id || null,
          c.path || '',
          c.order_ind || 0,
          parentId,
          imageUrl,
          c.url_path || null,
          c.allowed_roles || [0],
        ]
      );

      if (res.rows[0]?.is_inserted) {
        catInserted++;
      } else {
        catUpdated++;
      }
      if (existingImg !== imageUrl) {
        imagesUpdated++;
      }
    }
    console.log(
      `✓ Categories sync completed: ${catInserted} new inserted, ${catUpdated} updated (${imagesUpdated} image URLs refreshed).`
    );

    // ----------------------------------------------------
    // 4. Sync Recordings (Non-destructive UPSERT)
    // ----------------------------------------------------
    console.log('\n--> [4/6] Fetching all recordings from Supabase prod.recordings...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS rsp.recordings (
        id BIGINT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT,
        eventid BIGINT,
        recdatetime TIMESTAMP,
        language TEXT,
        venue TEXT,
        recmedia TEXT,
        speaker TEXT,
        audioid TEXT,
        videoid TEXT,
        orderind BIGINT,
        parentid BIGINT,
        gdriveid TEXT,
        videogdriveid TEXT,
        access TEXT,
        comment TEXT,
        allowed_roles INTEGER[] DEFAULT '{0}'
      );
      ALTER TABLE rsp.recordings ADD COLUMN IF NOT EXISTS allowed_roles INTEGER[] DEFAULT '{0}';
      CREATE INDEX IF NOT EXISTS idx_recordings_parentid ON rsp.recordings (parentid);
      CREATE INDEX IF NOT EXISTS idx_recordings_recdatetime ON rsp.recordings (recdatetime);
    `);

    const REC_PAGE = 1000;
    let recInserted = 0;
    let recUpdated = 0;
    let recTotal = 0;

    for (let from = 0; ; from += REC_PAGE) {
      const { data, error } = await sbProd.from('recordings').select('*').range(from, from + REC_PAGE - 1);
      if (error) {
        console.error('Error fetching recordings:', error.message);
        break;
      }
      if (!data || data.length === 0) break;

      for (const r of data) {
        const speakerName =
          r.speaker_ids && r.speaker_ids[0]
            ? speakerMap.get(r.speaker_ids[0]) || 'Radheshyam Das'
            : 'Radheshyam Das';
        const venueName = r.venues_id ? venueMap.get(r.venues_id) || 'NVCC' : 'NVCC';
        const langName =
          r.lang_ids && r.lang_ids[0] ? langMap.get(r.lang_ids[0]) || 'English' : 'English';

        const res = await client.query(
          `INSERT INTO rsp.recordings (
             id, name, path, eventid, recdatetime, language, venue,
             recmedia, speaker, audioid, videoid, orderind, parentid,
             gdriveid, videogdriveid, allowed_roles
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             path = EXCLUDED.path,
             eventid = EXCLUDED.eventid,
             recdatetime = EXCLUDED.recdatetime,
             language = EXCLUDED.language,
             venue = EXCLUDED.venue,
             recmedia = EXCLUDED.recmedia,
             speaker = EXCLUDED.speaker,
             audioid = EXCLUDED.audioid,
             videoid = EXCLUDED.videoid,
             orderind = EXCLUDED.orderind,
             parentid = EXCLUDED.parentid,
             gdriveid = EXCLUDED.gdriveid,
             videogdriveid = EXCLUDED.videogdriveid,
             allowed_roles = COALESCE(EXCLUDED.allowed_roles, rsp.recordings.allowed_roles)
           RETURNING (xmax = 0) AS is_inserted;`,
          [
            r.id,
            r.name,
            r.name,
            r.event_id || null,
            r.recorded_at ? new Date(r.recorded_at) : null,
            langName,
            venueName,
            r.yt_id ? 'Video,Audio' : 'Audio',
            speakerName,
            r.audio_id || null,
            r.yt_id || null,
            r.order_ind || 0,
            r.category_id || null,
            r.audio_id || null,
            null,
            r.allowed_roles || [0],
          ]
        );

        if (res.rows[0]?.is_inserted) {
          recInserted++;
        } else {
          recUpdated++;
        }
        recTotal++;
      }

      process.stdout.write(`Processed ${recTotal} recordings...\r`);
      if (data.length < REC_PAGE) break;
    }
    console.log(`\n✓ Recordings sync completed: ${recInserted} new inserted, ${recUpdated} updated.`);

    // ----------------------------------------------------
    // 5. Sync Materials (Non-destructive UPSERT)
    // ----------------------------------------------------
    console.log('\n--> [5/6] Fetching all materials from Supabase prod.materials...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS rsp.materials (
        id BIGINT PRIMARY KEY,
        recordingid BIGINT,
        name TEXT,
        uri TEXT,
        type TEXT,
        size TEXT,
        gdriveid TEXT,
        allowed_roles INTEGER[] DEFAULT '{0}'
      );
      ALTER TABLE rsp.materials ADD COLUMN IF NOT EXISTS allowed_roles INTEGER[] DEFAULT '{0}';
      CREATE INDEX IF NOT EXISTS idx_materials_recordingid ON rsp.materials (recordingid);
    `);

    const MAT_PAGE = 1000;
    let matInserted = 0;
    let matUpdated = 0;
    let matTotal = 0;

    for (let from = 0; ; from += MAT_PAGE) {
      const { data, error } = await sbProd.from('materials').select('*').range(from, from + MAT_PAGE - 1);
      if (error) {
        console.error('Error fetching materials:', error.message);
        break;
      }
      if (!data || data.length === 0) break;

      for (const m of data) {
        const res = await client.query(
          `INSERT INTO rsp.materials (id, recordingid, name, uri, type, size, gdriveid, allowed_roles)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             recordingid = EXCLUDED.recordingid,
             name = EXCLUDED.name,
             uri = EXCLUDED.uri,
             type = EXCLUDED.type,
             size = EXCLUDED.size,
             gdriveid = EXCLUDED.gdriveid,
             allowed_roles = COALESCE(EXCLUDED.allowed_roles, rsp.materials.allowed_roles)
           RETURNING (xmax = 0) AS is_inserted;`,
          [
            m.id,
            m.recording_id,
            m.name,
            m.uri,
            m.type,
            String(m.size || ''),
            m.uri,
            m.allowed_roles || [0],
          ]
        );

        if (res.rows[0]?.is_inserted) {
          matInserted++;
        } else {
          matUpdated++;
        }
        matTotal++;
      }

      process.stdout.write(`Processed ${matTotal} materials...\r`);
      if (data.length < MAT_PAGE) break;
    }
    console.log(`\n✓ Materials sync completed: ${matInserted} new inserted, ${matUpdated} updated.`);

    // ----------------------------------------------------
    // 6. Verification Summary
    // ----------------------------------------------------
    console.log('\n--> [6/6] Verifying database records...');
    const catCount = await client.query('SELECT COUNT(*) FROM rsp.categories;');
    const recCount = await client.query('SELECT COUNT(*) FROM rsp.recordings;');
    const matCount = await client.query('SELECT COUNT(*) FROM rsp.materials;');
    const imgCount = await client.query(
      "SELECT COUNT(*) FROM rsp.categories WHERE image_url LIKE '%googleusercontent.com%';"
    );

    console.log(`\n======================================================`);
    console.log(`🎉 SAFE SYNC COMPLETED SUCCESSFULLY!`);
    console.log(`======================================================`);
    console.log(`- Total Categories in DB: ${catCount.rows[0].count} (Google Drive CDN Images: ${imgCount.rows[0].count})`);
    console.log(`- Total Recordings in DB: ${recCount.rows[0].count} (${recInserted} newly added)`);
    console.log(`- Total Materials in DB:  ${matCount.rows[0].count} (${matInserted} newly added)`);
    console.log(`- Total Deletions:        0 (Zero records were deleted)`);
    console.log(`======================================================\n`);

  } finally {
    client.release();
    await pool.end();
  }
}

runSafeSync().catch((err) => {
  console.error('\n❌ Fatal Sync Error:', err);
  process.exit(1);
});
