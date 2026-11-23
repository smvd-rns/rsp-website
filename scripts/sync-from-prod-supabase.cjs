const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bfiyqzcnmkpczkmgounm.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

const localPool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'rsp_db',
  user: 'postgres',
  password: 'postgres',
});

const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  db: { schema: 'prod' }
});

async function sync() {
  const client = await localPool.connect();
  console.log('Connected to local PostgreSQL rsp_db.');

  try {
    // 1. Fetch lookup maps from Supabase
    console.log('Fetching lookup tables (speakers, venues, languages, events)...');
    const { data: speakersData } = await sb.from('speakers').select('id, name');
    const speakerMap = new Map((speakersData || []).map(s => [s.id, s.name]));

    const { data: venuesData } = await sb.from('venues').select('id, name');
    const venueMap = new Map((venuesData || []).map(v => [v.id, v.name]));

    const { data: languagesData } = await sb.from('languages').select('id, name');
    const langMap = new Map((languagesData || []).map(l => [l.id, l.name]));

    const { data: eventsData } = await sb.from('events').select('id, name, short_name');
    console.log(`Loaded ${speakerMap.size} speakers, ${venueMap.size} venues, ${langMap.size} languages, ${(eventsData || []).length} events.`);

    // Recreate rsp.events
    await client.query(`
      DROP TABLE IF EXISTS rsp.events CASCADE;
      CREATE TABLE rsp.events (
        id BIGINT PRIMARY KEY,
        name TEXT,
        shortname TEXT
      );
    `);

    for (const e of eventsData || []) {
      await client.query(
        'INSERT INTO rsp.events (id, name, shortname) VALUES ($1, $2, $3)',
        [e.id, e.name, e.short_name]
      );
    }
    console.log('Synced events table.');

    // 2. Fetch all categories from Supabase
    console.log('Fetching all categories from Supabase prod.categories...');
    let allCategories = [];
    const CAT_PAGE = 1000;
    for (let from = 0; ; from += CAT_PAGE) {
      const { data, error } = await sb.from('categories').select('*').range(from, from + CAT_PAGE - 1);
      if (error) {
        console.error('Error fetching categories:', error);
        break;
      }
      if (!data || data.length === 0) break;
      allCategories = allCategories.concat(data);
      if (data.length < CAT_PAGE) break;
    }
    console.log(`Total categories fetched from Supabase: ${allCategories.length}`);

    await client.query(`
      DROP TABLE IF EXISTS rsp.categories CASCADE;
      CREATE TABLE rsp.categories (
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
        url_path TEXT
      );
      CREATE INDEX idx_categories_url_path ON rsp.categories (url_path);
      CREATE INDEX idx_categories_parentid ON rsp.categories (parentid);
    `);

    const imageDir = path.join(__dirname, '..', 'public', 'category-images');

    for (const c of allCategories) {
      let parentId = null;
      if (c.path && c.path.trim()) {
        const segments = c.path.split('.').filter(Boolean);
        if (segments.length > 0) {
          parentId = Number(segments[segments.length - 1]);
        }
      }

      let imageUrl = '/rsp.webp';
      if (c.img_id) {
        const b36 = Number(c.img_id).toString(36);
        const fileName = `${b36}.webp`;
        if (fs.existsSync(path.join(imageDir, fileName))) {
          imageUrl = `/category-images/${fileName}`;
        }
      }

      await client.query(`
        INSERT INTO rsp.categories (
          id, name, img, path, orderind, parentid, image_url, url_path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        c.id,
        c.name,
        c.img_id || null,
        c.path || '',
        c.order_ind || 0,
        parentId,
        imageUrl,
        c.url_path || null
      ]);
    }
    console.log(`Successfully synced ${allCategories.length} categories to local DB!`);

    // 3. Fetch all materials from Supabase
    console.log('Fetching all materials from Supabase prod.materials...');
    let allMaterials = [];
    const MAT_PAGE = 1000;
    for (let from = 0; ; from += MAT_PAGE) {
      const { data, error } = await sb.from('materials').select('*').range(from, from + MAT_PAGE - 1);
      if (error) {
        console.error('Error fetching materials:', error);
        break;
      }
      if (!data || data.length === 0) break;
      allMaterials = allMaterials.concat(data);
      if (data.length < MAT_PAGE) break;
    }
    console.log(`Total materials fetched: ${allMaterials.length}`);

    await client.query(`
      DROP TABLE IF EXISTS rsp.materials CASCADE;
      CREATE TABLE rsp.materials (
        id BIGINT PRIMARY KEY,
        recordingid BIGINT,
        name TEXT,
        uri TEXT,
        type TEXT,
        size TEXT,
        gdriveid TEXT
      );
      CREATE INDEX idx_materials_recordingid ON rsp.materials (recordingid);
    `);

    const BATCH_SIZE = 500;
    for (let i = 0; i < allMaterials.length; i += BATCH_SIZE) {
      const batch = allMaterials.slice(i, i + BATCH_SIZE);
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const m of batch) {
        values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
        params.push(m.id, m.recording_id, m.name, m.uri, m.type, String(m.size || ''), m.uri);
      }

      await client.query(`
        INSERT INTO rsp.materials (id, recordingid, name, uri, type, size, gdriveid)
        VALUES ${values.join(', ')}
      `, params);
    }
    console.log(`Successfully synced ${allMaterials.length} materials.`);

    // 4. Fetch all recordings from Supabase
    console.log('Fetching all recordings from Supabase prod.recordings...');
    await client.query(`
      DROP TABLE IF EXISTS rsp.recordings CASCADE;
      CREATE TABLE rsp.recordings (
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
        comment TEXT
      );
      CREATE INDEX idx_recordings_parentid ON rsp.recordings (parentid);
      CREATE INDEX idx_recordings_recdatetime ON rsp.recordings (recdatetime);
    `);

    const REC_PAGE = 1000;
    let recCount = 0;
    for (let from = 0; ; from += REC_PAGE) {
      const { data, error } = await sb.from('recordings').select('*').range(from, from + REC_PAGE - 1);
      if (error) {
        console.error('Error fetching recordings:', error);
        break;
      }
      if (!data || data.length === 0) break;

      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const r of data) {
        const speakerName = (r.speaker_ids && r.speaker_ids[0]) ? (speakerMap.get(r.speaker_ids[0]) || 'Radheshyam Das') : 'Radheshyam Das';
        const venueName = (r.venues_id) ? (venueMap.get(r.venues_id) || 'NVCC') : 'NVCC';
        const langName = (r.lang_ids && r.lang_ids[0]) ? (langMap.get(r.lang_ids[0]) || 'English') : 'English';

        values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
        params.push(
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
          null
        );
        recCount++;
      }

      await client.query(`
        INSERT INTO rsp.recordings (
          id, name, path, eventid, recdatetime, language, venue,
          recmedia, speaker, audioid, videoid, orderind, parentid,
          gdriveid, videogdriveid
        ) VALUES ${values.join(', ')}
      `, params);

      process.stdout.write(`Synced ${recCount} recordings...\r`);
      if (data.length < REC_PAGE) break;
    }
    console.log(`\nSuccessfully synced all ${recCount} recordings into local PostgreSQL!`);

    // Verify root categories
    const roots = await client.query(`
      SELECT id, name, img, image_url, url_path 
      FROM rsp.categories 
      WHERE parentid IS NULL OR parentid = 0 
      ORDER BY orderind ASC;
    `);
    console.log('\nVerified Root Categories in Local Database:');
    for (const row of roots.rows) {
      console.log(` - [${row.id}] ${row.name} => ${row.image_url} (${row.url_path})`);
    }

  } finally {
    client.release();
    await localPool.end();
  }
}

sync().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
