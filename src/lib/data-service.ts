import pool from './db';
import { naturalSortByName } from './utils';
import type { Category, EnrichedRecording } from '@/types';
import type { CategoryPageData } from '@/hooks/use-category-page';

export interface DbCategory {
  id: string;
  name: string;
  img: string | null;
  image_url: string | null;
  path: string;
  orderind: number;
  parentid: string | null;
  recording_count?: number;
  subcategory_count?: number;
}

export interface DbRecording {
  id: string;
  name: string;
  path: string;
  recdatetime: string | null;
  language: string | null;
  venue: string | null;
  speaker: string | null;
  audioid: string | null;
  videoid: string | null;
  orderind: number;
  parentid: string | null;
  gdriveid: string | null;
}

const mapCategoryRow = (row: any): Category => {
  const base36 = row.img ? Number(row.img).toString(36) : '';
  const resolvedImg = row.image_url || (base36 ? `/category-images/${base36}.webp` : '/rsp.webp');
  const safeUrlPath = row.url_path || (row.path || row.name || '').toString()
    .split('/')
    .map((seg: string) =>
      seg
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )
    .filter(Boolean)
    .join('.');

  return {
    id: Number(row.id),
    name: row.name,
    img: row.img ? Number(row.img) : null,
    image_url: resolvedImg,
    path: row.path || '',
    url_path: safeUrlPath || `cat-${row.id}`,
    order_ind: Number(row.orderind || 0),
    parent_id: row.parentid ? Number(row.parentid) : null,
    gdrive_id: row.gdriveid || null,
    allowed_roles: Array.isArray(row.allowed_roles) && row.allowed_roles.length > 0 ? row.allowed_roles : [0],
  };
};

const mapRecordingRow = (row: any, materialsMap?: Map<string, any[]>): EnrichedRecording => {
  const mats = (materialsMap?.get(String(row.id)) || []).map((m: any) => ({
    id: Number(m.id),
    name: m.name,
    recording_id: Number(row.id),
    type: m.type || (m.name.endsWith('.pdf') ? 'pdf' : m.name.endsWith('.pptx') ? 'pptx' : 'doc'),
    uri: m.gdriveid || '',
    size: '1 MB',
    order_ind: 0,
    created_at: null,
    updated_at: null,
  }));

  const rawVenue = row.venue || '';
  const normalizedVenue = rawVenue.toLowerCase() === 'hyd' ? 'Hyderabad' : (rawVenue || 'NVCC');
  const normalizedSpeaker = row.speaker || 'Radheshyam Das';
  const speakerName = normalizedSpeaker.startsWith('HG ') ? normalizedSpeaker : `HG ${normalizedSpeaker}`;
  const isoDate = row.recdatetime ? new Date(row.recdatetime).toISOString() : null;

  return {
    id: Number(row.id),
    name: row.name,
    path: row.path || '',
    event_id: row.eventid ? Number(row.eventid) : null,
    event_name: row.event_name || null,
    event_short_name: row.event_short_name || null,
    recdatetime: isoDate,
    recorded_at: isoDate,
    language: row.language || 'English',
    venue: normalizedVenue,
    speaker: speakerName,
    recmedia: row.recmedia || 'Audio',
    audio_id: row.audioid || null,
    video_id: row.videoid || null,
    yt_id: row.videoid || null,
    order_ind: Number(row.orderind || 0),
    category_id: row.parentid ? Number(row.parentid) : null,
    gdrive_id: row.gdriveid || null,
    video_gdrive_id: row.videogdriveid || null,
    materials: mats,
    allowed_roles: Array.isArray(row.allowed_roles) && row.allowed_roles.length > 0 ? row.allowed_roles : [0],
    created_at: isoDate,
    updated_at: null,
    size: null,
    type_id: null,
    speaker_ids: [],
    lang_ids: [],
    venues_id: null,
  } as any;
};

/**
 * Fetch all top-level root categories with role-based access filtering
 */
export async function getRootCategories(roleId?: number): Promise<Category[]> {
  const isSuperAdmin = roleId === 1;
  let queryText = `
    SELECT 
      c.id, 
      c.name, 
      c.img, 
      c.image_url, 
      c.path, 
      c.orderind,
      c.parentid,
      c.allowed_roles,
      c.url_path
    FROM rsp.categories c 
    WHERE (c.parentid IS NULL OR c.parentid = 0)
  `;
  const params: any[] = [];

  if (!isSuperAdmin) {
    queryText += `
      AND c.name NOT ILIKE '%dump%'
      AND c.name NOT ILIKE '%test%'
      AND c.name NOT ILIKE '%segregate%'
      AND c.name NOT ILIKE '%trash%'
    `;
    if (roleId && roleId > 1) {
      params.push(roleId);
      queryText += ` AND (0 = ANY(c.allowed_roles) OR $${params.length} = ANY(c.allowed_roles))`;
    } else {
      queryText += ` AND (0 = ANY(c.allowed_roles))`;
    }
  }

  queryText += ` ORDER BY c.orderind ASC NULLS LAST, c.id ASC;`;

  const result = await pool.query(queryText, params);
  return result.rows.map(mapCategoryRow);
}

/**
 * Fetch recent high-value recordings for homepage spotlight with role filtering
 */
export async function getFeaturedRecordings(limit = 12, roleId?: number): Promise<EnrichedRecording[]> {
  const isSuperAdmin = roleId === 1;
  let whereClause = `WHERE r.audioid IS NOT NULL AND r.audioid != ''`;
  const params: any[] = [];

  if (!isSuperAdmin) {
    if (roleId && roleId > 1) {
      params.push(roleId);
      whereClause += ` AND (0 = ANY(r.allowed_roles) OR $${params.length} = ANY(r.allowed_roles))`;
    } else {
      whereClause += ` AND (0 = ANY(r.allowed_roles))`;
    }
  }

  params.push(limit);
  const result = await pool.query(
    `
    SELECT 
      r.*,
      e.name AS event_name,
      e.shortname AS event_short_name
    FROM rsp.recordings r
    LEFT JOIN rsp.events e ON e.id = r.eventid::bigint
    ${whereClause}
    ORDER BY r.recdatetime DESC NULLS LAST, r.id DESC 
    LIMIT $${params.length};
  `,
    params,
  );

  const recIds = result.rows.map((r: any) => r.id);
  const materialsMap = new Map<string, any[]>();
  if (recIds.length > 0) {
    const matRes = await pool.query(
      `SELECT * FROM rsp.materials WHERE recordingid = ANY($1)`,
      [recIds],
    );
    matRes.rows.forEach((m: any) => {
      const recId = String(m.recordingid);
      if (!materialsMap.has(recId)) materialsMap.set(recId, []);
      materialsMap.get(recId)!.push(m);
    });
  }

  return result.rows.map((row: any) => mapRecordingRow(row, materialsMap));
}

/**
 * Fast Category Page Data directly from PostgreSQL with role-based filtering
 */
export async function getCategoryPageDataFromDb(
  urlPath: string,
  roleId?: number,
): Promise<CategoryPageData> {
  // If empty, this is the Homepage!
  if (!urlPath || urlPath === '/' || urlPath === 'home') {
    const [subcategories, recordings] = await Promise.all([
      getRootCategories(roleId),
      getFeaturedRecordings(12, roleId),
    ]);
    return {
      category: undefined,
      subcategories,
      recordings,
    };
  }

  // Find category by matching exact url_path, id, or path hierarchy
  const cleanPath = urlPath.replace(/^\/+|\/+$/g, '').replaceAll('/', '.');
  const isNumeric = /^\d+$/.test(cleanPath);

  let catResult;
  if (isNumeric) {
    catResult = await pool.query(
      `SELECT * FROM rsp.categories WHERE id = $1 LIMIT 1`,
      [cleanPath],
    );
  } else {
    // 1. Exact match on url_path or path hierarchy
    catResult = await pool.query(
      `SELECT * FROM rsp.categories 
       WHERE url_path = $1 
          OR id::text = $1
          OR url_path LIKE '%.' || $1
          OR url_path LIKE $1 || '.%'
       ORDER BY 
         CASE WHEN url_path = $1 THEN 0 ELSE 1 END,
         CASE WHEN url_path LIKE 'all-category-dump%' THEN 1 ELSE 0 END ASC,
         (CASE WHEN parentid IS NULL OR parentid = 0 THEN 0 ELSE 1 END) ASC,
         id ASC
       LIMIT 1`,
      [cleanPath],
    );

    // 2. Fallback if not found: try leaf matching
    if (catResult.rows.length === 0) {
      const segments = cleanPath.split('.').filter(Boolean);
      const leafSlug = segments[segments.length - 1] || cleanPath;
      const leafName = leafSlug.replace(/-/g, ' ');
      catResult = await pool.query(
        `SELECT * FROM rsp.categories 
         WHERE lower(name) = lower($1)
            OR replace(lower(name), ' ', '-') = lower($2)
            OR url_path LIKE '%' || $2
         ORDER BY 
           CASE WHEN lower(name) = lower($1) THEN 0 ELSE 1 END,
           CASE WHEN url_path LIKE 'all-category-dump%' THEN 1 ELSE 0 END ASC,
           id ASC
         LIMIT 1`,
        [leafName, leafSlug],
      );
    }
  }

  if (catResult.rows.length === 0) {
    return {
      category: undefined,
      subcategories: [],
      recordings: [],
    };
  }

  const category = mapCategoryRow(catResult.rows[0]);
  const isSuperAdmin = roleId === 1;
  const allowed = category.allowed_roles || [0];
  const hasAccess = isSuperAdmin || allowed.includes(0) || (roleId && allowed.includes(roleId));

  if (!hasAccess) {
    return {
      category: undefined,
      subcategories: [],
      recordings: [],
    };
  }

  // Fetch its subcategories and its recordings in parallel
  let subWhere = `WHERE parentid = $1`;
  let recWhere = `WHERE r.parentid = $1`;
  const subParams: any[] = [category.id];
  const recParams: any[] = [category.id];

  if (!isSuperAdmin) {
    if (roleId && roleId > 1) {
      subParams.push(roleId);
      subWhere += ` AND (0 = ANY(allowed_roles) OR $${subParams.length} = ANY(allowed_roles))`;
      recParams.push(roleId);
      recWhere += ` AND (0 = ANY(r.allowed_roles) OR $${recParams.length} = ANY(r.allowed_roles))`;
    } else {
      subWhere += ` AND (0 = ANY(allowed_roles))`;
      recWhere += ` AND (0 = ANY(r.allowed_roles))`;
    }
  }

  const [subRes, recRes] = await Promise.all([
    pool.query(
      `SELECT * FROM rsp.categories 
       ${subWhere} 
       ORDER BY orderind ASC NULLS LAST, name ASC`,
      subParams,
    ),
    pool.query(
      `SELECT 
         r.*,
         e.name AS event_name,
         e.shortname AS event_short_name
       FROM rsp.recordings r
       LEFT JOIN rsp.events e ON e.id = r.eventid::bigint
       ${recWhere} 
       ORDER BY r.orderind ASC NULLS LAST, r.recdatetime DESC NULLS LAST, r.id ASC`,
      recParams,
    ),
  ]);

  const recIds = recRes.rows.map((r: any) => r.id);
  const materialsMap = new Map<string, any[]>();
  if (recIds.length > 0) {
    const matRes = await pool.query(
      `SELECT * FROM rsp.materials WHERE recordingid = ANY($1)`,
      [recIds],
    );
    matRes.rows.forEach((m: any) => {
      const recId = String(m.recordingid);
      if (!materialsMap.has(recId)) materialsMap.set(recId, []);
      materialsMap.get(recId)!.push(m);
    });
  }

  // Fetch parent categories for breadcrumb hierarchy
  const parentIds = (catResult.rows[0].path || '')
    .split('.')
    .filter(Boolean)
    .map(Number);
  let parentCategories: any[] = [];
  if (parentIds.length > 0) {
    const pRes = await pool.query(
      `SELECT id, name, url_path FROM rsp.categories WHERE id = ANY($1)`,
      [parentIds],
    );
    const pMap = new Map(pRes.rows.map((r: any) => [Number(r.id), r]));
    parentCategories = parentIds.map((id) => pMap.get(id)).filter(Boolean);
  }

  const breadcrumbs = [
    ...parentCategories.map((p: any) => ({
      label: p.name,
      href: `/${(p.url_path || '').replaceAll('.', '/')}`,
    })),
    {
      label: category.name,
      href: `/${(category.url_path || '').replaceAll('.', '/')}`,
    },
  ];

  return {
    category,
    subcategories: subRes.rows.map(mapCategoryRow).sort(naturalSortByName()),
    recordings: recRes.rows.map((row: any) => mapRecordingRow(row, materialsMap)).sort(naturalSortByName()),
    breadcrumbs,
  };
}

/**
 * Fast search across recordings, categories, materials, and events with role filtering
 */
export async function searchContent(
  query: string,
  language?: string,
  limit = 20,
  roleId?: number,
) {
  const trimmed = query.trim();
  if (!trimmed) return { categories: [], recordings: [], materials: [] };

  const isSuperAdmin = roleId === 1;
  const pattern = `%${trimmed}%`;

  let catRoleWhere = "";
  let recRoleWhere = "";
  let matRoleWhere = "";
  const catParams: any[] = [pattern, trimmed];
  const recParams: any[] = [pattern];
  const matParams: any[] = [pattern, trimmed];

  if (!isSuperAdmin) {
    catRoleWhere += " AND url_path NOT LIKE 'all-category-dump%' AND url_path NOT LIKE 'trash%'";
    recRoleWhere += " AND c.url_path NOT LIKE 'all-category-dump%' AND c.url_path NOT LIKE 'trash%'";
    matRoleWhere += " AND c.url_path NOT LIKE 'all-category-dump%' AND c.url_path NOT LIKE 'trash%'";

    if (roleId && roleId > 1) {
      catParams.push(roleId);
      catRoleWhere += ` AND (0 = ANY(allowed_roles) OR $${catParams.length} = ANY(allowed_roles))`;

      recParams.push(roleId);
      recRoleWhere += ` AND (0 = ANY(r.allowed_roles) OR $${recParams.length} = ANY(r.allowed_roles))`;
      recRoleWhere += ` AND (c.allowed_roles IS NULL OR 0 = ANY(c.allowed_roles) OR $${recParams.length} = ANY(c.allowed_roles))`;

      matParams.push(roleId);
      matRoleWhere += ` AND (c.allowed_roles IS NULL OR 0 = ANY(c.allowed_roles) OR $${matParams.length} = ANY(c.allowed_roles))`;
      matRoleWhere += ` AND (0 = ANY(r.allowed_roles) OR $${matParams.length} = ANY(r.allowed_roles))`;
      matRoleWhere += ` AND (m.allowed_roles IS NULL OR m.allowed_roles = '{}' OR 0 = ANY(m.allowed_roles) OR $${matParams.length} = ANY(m.allowed_roles))`;
    } else {
      catRoleWhere += ` AND (0 = ANY(allowed_roles))`;
      recRoleWhere += ` AND (0 = ANY(r.allowed_roles)) AND (c.allowed_roles IS NULL OR 0 = ANY(c.allowed_roles))`;
      matRoleWhere += ` AND (c.allowed_roles IS NULL OR 0 = ANY(c.allowed_roles)) AND (0 = ANY(r.allowed_roles)) AND (m.allowed_roles IS NULL OR m.allowed_roles = '{}' OR 0 = ANY(m.allowed_roles))`;
    }
  } else {
    catRoleWhere += " AND url_path NOT LIKE 'trash%'";
    recRoleWhere += " AND (c.url_path IS NULL OR c.url_path NOT LIKE 'trash%')";
    matRoleWhere += " AND (c.url_path IS NULL OR c.url_path NOT LIKE 'trash%')";
  }

  const catPromise = pool.query(
    `
    SELECT id, name, img, image_url, path, url_path, orderind, parentid, allowed_roles
    FROM rsp.categories 
    WHERE (name ILIKE $1 OR url_path ILIKE $1)
      ${catRoleWhere}
    ORDER BY 
      CASE WHEN lower(name) = lower($2) THEN 0 ELSE 1 END,
      (CASE WHEN parentid IS NULL OR parentid = 0 THEN 0 ELSE 1 END) ASC,
      orderind ASC
    LIMIT 8;
  `,
    catParams,
  );

  let recQuery = `
    SELECT 
      r.*,
      e.name AS event_name,
      e.shortname AS event_short_name,
      c.name AS category_name,
      c.url_path AS category_url_path
    FROM rsp.recordings r
    LEFT JOIN rsp.events e ON e.id = r.eventid::bigint
    INNER JOIN rsp.categories c ON c.id = r.parentid
    WHERE (
      r.name ILIKE $1 
      OR r.speaker ILIKE $1 
      OR r.venue ILIKE $1 
      OR e.name ILIKE $1 
      OR e.shortname ILIKE $1
    )
    ${recRoleWhere}
  `;

  if (language && language !== 'All') {
    recParams.push(language);
    recQuery += ` AND r.language ILIKE $${recParams.length}`;
  }

  recParams.push(trimmed);
  const exactParamIdx = recParams.length;

  recParams.push(limit);
  const limitParamIdx = recParams.length;

  recQuery += ` 
    ORDER BY 
      CASE WHEN lower(r.name) ILIKE lower($${exactParamIdx}) THEN 0 ELSE 1 END,
      r.recdatetime DESC NULLS LAST, 
      r.id DESC 
    LIMIT $${limitParamIdx}
  `;

  // Search in materials
  const matPromise = pool.query(
    `
    SELECT 
      m.id,
      m.recordingid,
      m.name,
      m.uri,
      m.type,
      m.size,
      m.gdriveid,
      r.name AS recording_name,
      r.speaker AS recording_speaker,
      r.recdatetime AS recording_date,
      c.id AS category_id,
      c.name AS category_name,
      c.url_path AS category_url_path
    FROM rsp.materials m
    INNER JOIN rsp.recordings r ON r.id = m.recordingid
    INNER JOIN rsp.categories c ON c.id = r.parentid
    WHERE m.name ILIKE $1
      ${matRoleWhere}
    ORDER BY 
      CASE WHEN lower(m.name) = lower($2) THEN 0 ELSE 1 END,
      m.id DESC
    LIMIT 15;
    `,
    matParams,
  );

  const [catRes, recRes, matRes] = await Promise.all([
    catPromise,
    pool.query(recQuery, recParams),
    matPromise,
  ]);

  const recordings = recRes.rows.map((row: any) => {
    const rec = mapRecordingRow(row);
    if (row.category_name && row.category_url_path) {
      (rec as any).category = {
        id: Number(row.parentid),
        name: row.category_name,
        url_path: row.category_url_path,
      };
    }
    return rec;
  });

  const materials = matRes.rows.map((row: any) => ({
    id: Number(row.id),
    recording_id: Number(row.recordingid),
    name: row.name,
    uri: row.uri || '',
    type: row.type || null,
    size: row.size ? Number(row.size) : null,
    allowed_roles: [],
    updated_at: null,
    recording: row.recording_name
      ? {
        id: Number(row.recordingid),
        name: row.recording_name,
        speaker: row.recording_speaker,
      }
      : null,
    category: row.category_name
      ? {
        id: Number(row.category_id),
        name: row.category_name,
        url_path: row.category_url_path,
      }
      : null,
  }));

  return {
    categories: catRes.rows.map(mapCategoryRow),
    recordings,
    materials,
  };
}
