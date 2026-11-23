"use server";

import { headers } from "next/headers";
import { verifyAdmin } from "@/lib/auth-utils";
import { query } from "@/lib/db";
import { revalidateCategoryPaths } from "@/lib/revalidate";
import {
  createResumableSession,
  prepareRecordingFolders,
  processRecordingUploads,
  trashRecording,
  untrashRecording,
} from "@/lib/upload-service";

export interface RecordingMaterialInput {
  id?: number | string;
  name: string;
  storage_key: string;
  mime_type?: string;
  size?: number | null;
  deleted?: boolean;
  is_generic?: boolean;
  is_link?: boolean;
}

export interface RecordingAudioInput {
  id: string;
  fileName: string;
  mimeType: string;
  size?: number | null;
  deleted?: boolean;
}

const revalidateRecordingCategory = async (
  categoryId: number,
  categoryUrlPath?: string | null,
) => {
  if (categoryUrlPath) {
    await revalidateCategoryPaths([categoryUrlPath]);
    return;
  }

  const catRes = await query(
    "SELECT url_path FROM rsp.categories WHERE id = $1 LIMIT 1;",
    [categoryId],
  );
  if (catRes.rows.length > 0 && catRes.rows[0].url_path) {
    await revalidateCategoryPaths([catRes.rows[0].url_path]);
  }
};

export interface RecordingInputData {
  name?: string;
  category_id?: number;
  speaker_ids?: number[];
  lang_ids?: number[] | null;
  venues_id?: number | null;
  event_id?: number | null;
  type_id?: number | null;
  speaker_name?: string | null;
  language_name?: string | null;
  venue_name?: string | null;
  speaker?: string | null;
  language?: string | null;
  venue?: string | null;
  audio_id?: string | null;
  audio_size?: number | null;
  audio_file_name?: string | null;
  audio_mime_type?: string | null;
  recorded_at?: string | null;
  yt_id?: string | null;
  materials?: RecordingMaterialInput[];
  audios?: RecordingAudioInput[];
  gdriveid?: string | null;
  videogdriveid?: string | null;
}

export const createRecording = async (
  data: RecordingInputData & {
    name: string;
    category_id: number;
    category_url_path: string;
  },
) => {
  await verifyAdmin();

  const activeAudio = (data.audios || []).find((a) => !a.deleted && a.id);
  const audioId = activeAudio?.id || data.audio_id;
  if (!audioId) {
    throw new Error("An active audio file is required to create a recording.");
  }

  // Calculate orderind
  const maxOrderRes = await query(
    "SELECT COALESCE(MAX(orderind), -1) + 1 AS next_order FROM rsp.recordings WHERE parentid = $1;",
    [data.category_id],
  );
  const newOrderInd = Number(maxOrderRes.rows[0].next_order);

  // Generate next id
  const nextIdRes = await query(
    "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM rsp.recordings;",
  );
  const newId = Number(nextIdRes.rows[0].next_id);

  // Resolve speaker name, language name, venue name directly from passed data
  const speakerName =
    data.speaker_name?.trim() || data.speaker?.trim() || "HG Radheshyam Das";
  const languageName =
    data.language_name?.trim() || data.language?.trim() || "English";
  const venueName = data.venue_name?.trim() || data.venue?.trim() || "";

  const recMedia = data.yt_id ? "Video,Audio" : "Audio";
  const recordedAt = data.recorded_at
    ? new Date(data.recorded_at).toISOString()
    : null;

  const insertRecSql = `
    INSERT INTO rsp.recordings (
      id, name, path, eventid, recdatetime, language, venue, recmedia,
      speaker, audioid, videoid, orderind, parentid, gdriveid, videogdriveid, allowed_roles
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16
    ) RETURNING *;
  `;

  const recInsertRes = await query(insertRecSql, [
    newId,
    data.name,
    data.name,
    data.event_id || null,
    recordedAt,
    languageName,
    venueName,
    recMedia,
    speakerName,
    audioId,
    data.yt_id || null,
    newOrderInd,
    data.category_id,
    data.gdriveid || null,
    data.videogdriveid || null,
    [1, 2, 3, 4, 5, 6, 7, 8, 0],
  ]);

  const recording = recInsertRes.rows[0];

  // Insert materials into rsp.materials
  const activeMaterials = (data.materials || []).filter((m) => !m.deleted);
  const insertedMaterials = [];
  if (activeMaterials.length > 0) {
    for (const mat of activeMaterials) {
      const nextMatIdRes = await query(
        "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM rsp.materials;",
      );
      const nextMatId = Number(nextMatIdRes.rows[0].next_id);
      const matRes = await query(
        `INSERT INTO rsp.materials (id, recordingid, name, uri, type, size, gdriveid, allowed_roles)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`,
        [
          nextMatId,
          newId,
          mat.name,
          mat.storage_key,
          mat.mime_type || null,
          mat.size ? String(mat.size) : null,
          mat.storage_key,
          [0],
        ],
      );
      if (matRes.rows.length > 0) {
        insertedMaterials.push(matRes.rows[0]);
      }
    }
  }

  const audios = [
    {
      id: audioId,
      fileName: data.audio_file_name || data.name,
      mimeType: data.audio_mime_type || "audio/mpeg",
      deleted: false,
    },
  ];
  if (data.audios) {
    for (const aud of data.audios) {
      if (aud.id !== audioId) {
        audios.push({
          id: aud.id,
          fileName: aud.fileName,
          mimeType: aud.mimeType,
          deleted: aud.deleted ?? false,
        });
      }
    }
  }

  const materials = activeMaterials
    .filter((m) => !(m.is_link || m.storage_key.startsWith("http")))
    .map((m) => ({
      id: m.storage_key,
      fileName: m.name,
      mimeType: m.mime_type || "application/octet-stream",
      deleted: m.deleted ?? false,
    }));

  try {
    await processRecordingUploads({
      recordingId: newId,
      categoryId: data.category_id,
      audios,
      materials,
    });
  } catch (err) {
    console.error("Failed to process recording uploads in Google Drive:", err);
  }

  await revalidateCategoryPaths([data.category_url_path]);

  return {
    success: true,
    recording: {
      ...recording,
      id: Number(recording.id),
      category_id: Number(recording.parentid),
      recorded_at: recording.recdatetime
        ? new Date(recording.recdatetime).toISOString()
        : null,
      audio_id: recording.audioid,
      yt_id: recording.videoid,
      speaker: recording.speaker,
      language: recording.language,
      venue: recording.venue,
    },
    materials: insertedMaterials,
  };
};

export const updateRecording = async (id: number, data: RecordingInputData) => {
  await verifyAdmin();

  if (data.audios !== undefined) {
    const hasActiveAudio = data.audios.some((a) => !a.deleted && a.id);
    if (!hasActiveAudio) {
      throw new Error(
        "An active audio file is required to update a recording.",
      );
    }
  } else if (data.audio_id !== undefined && !data.audio_id) {
    throw new Error("An active audio file is required to update a recording.");
  }

  const recRes = await query(
    "SELECT id, name, parentid, audioid, videoid, videogdriveid, gdriveid FROM rsp.recordings WHERE id = $1 LIMIT 1;",
    [id],
  );
  if (recRes.rows.length === 0) throw new Error("Recording not found");
  const existingRecording = recRes.rows[0];

  const targetCategoryId =
    data.category_id ?? Number(existingRecording.parentid);

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIdx++}`);
    values.push(data.name);
  }
  if (data.category_id !== undefined) {
    updates.push(`parentid = $${paramIdx++}`);
    values.push(data.category_id);
  }
  if (data.audio_id !== undefined) {
    updates.push(`audioid = $${paramIdx++}`);
    values.push(data.audio_id);
  }
  if (data.yt_id !== undefined) {
    updates.push(`videoid = $${paramIdx++}`);
    values.push(data.yt_id);
  }
  if (data.recorded_at !== undefined) {
    updates.push(`recdatetime = $${paramIdx++}`);
    values.push(
      data.recorded_at ? new Date(data.recorded_at).toISOString() : null,
    );
  }
  if (data.speaker_name !== undefined || data.speaker !== undefined) {
    updates.push(`speaker = $${paramIdx++}`);
    values.push(
      data.speaker_name?.trim() || data.speaker?.trim() || "HG Radheshyam Das",
    );
  }
  if (data.language_name !== undefined || data.language !== undefined) {
    updates.push(`language = $${paramIdx++}`);
    values.push(
      data.language_name?.trim() || data.language?.trim() || "English",
    );
  }
  if (data.venue_name !== undefined || data.venue !== undefined) {
    updates.push(`venue = $${paramIdx++}`);
    values.push(data.venue_name?.trim() || data.venue?.trim() || "");
  }
  if (data.event_id !== undefined) {
    updates.push(`eventid = $${paramIdx++}`);
    values.push(data.event_id);
  }

  if (updates.length > 0) {
    values.push(id);
    await query(
      `UPDATE rsp.recordings SET ${updates.join(", ")} WHERE id = $${paramIdx};`,
      values,
    );
  }

  if (data.materials !== undefined) {
    const newMats = data.materials || [];
    const toDelete = newMats
      .filter((m) => typeof m.id === "number" && m.deleted)
      .map((m) => Number(m.id));
    if (toDelete.length > 0) {
      await query("DELETE FROM rsp.materials WHERE id = ANY($1::bigint[]);", [
        toDelete,
      ]);
    }

    const activeNewMats = newMats.filter((m) => !m.deleted);
    for (const m of activeNewMats) {
      if (typeof m.id === "number") {
        await query(
          "UPDATE rsp.materials SET name = $1, uri = $2, type = $3, size = $4, gdriveid = $2 WHERE id = $5;",
          [
            m.name,
            m.storage_key,
            m.mime_type || null,
            m.size ? String(m.size) : null,
            m.id,
          ],
        );
      } else {
        const nextMatIdRes = await query(
          "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM rsp.materials;",
        );
        const nextMatId = Number(nextMatIdRes.rows[0].next_id);
        await query(
          "INSERT INTO rsp.materials (id, recordingid, name, uri, type, size, gdriveid, allowed_roles) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);",
          [
            nextMatId,
            id,
            m.name,
            m.storage_key,
            m.mime_type || null,
            m.size ? String(m.size) : null,
            m.storage_key,
            [0],
          ],
        );
      }
    }
  }

  // Process drive moves if needed
  const audiosToProcess = [];
  if (data.audios) {
    for (const aud of data.audios) {
      audiosToProcess.push({
        id: aud.id,
        fileName: aud.fileName,
        mimeType: aud.mimeType,
        deleted: aud.deleted ?? false,
      });
    }
  } else if (data.audio_id || existingRecording.audioid) {
    const audioFileId = data.audio_id || existingRecording.audioid;
    if (audioFileId) {
      audiosToProcess.push({
        id: audioFileId,
        fileName: data.audio_file_name || "",
        mimeType: data.audio_mime_type || "audio/mpeg",
        deleted: false,
      });
    }
  }

  const materialsToProcess = (data.materials || [])
    .filter((m) => !(m.is_link || m.storage_key.startsWith("http")))
    .map((m) => ({
      id: m.storage_key,
      fileName: m.name,
      mimeType: m.mime_type || "application/octet-stream",
      deleted: m.deleted ?? false,
    }));

  try {
    await processRecordingUploads({
      recordingId: id,
      categoryId: targetCategoryId,
      videoGdriveId: existingRecording.videogdriveid || undefined,
      audios: audiosToProcess,
      materials: materialsToProcess,
    });
  } catch (err) {
    console.error("Failed to process recording updates in Google Drive:", err);
  }

  const catRes = await query(
    "SELECT url_path FROM rsp.categories WHERE id = $1 LIMIT 1;",
    [targetCategoryId],
  );
  if (catRes.rows.length > 0 && catRes.rows[0].url_path) {
    await revalidateCategoryPaths([catRes.rows[0].url_path]);
  }

  const updatedRecRes = await query(
    "SELECT * FROM rsp.recordings WHERE id = $1 LIMIT 1;",
    [id],
  );
  if (updatedRecRes.rows.length > 0) {
    const u = updatedRecRes.rows[0];
    return {
      success: true,
      recording: {
        ...u,
        id: Number(u.id),
        category_id: Number(u.parentid),
        recorded_at: u.recdatetime
          ? new Date(u.recdatetime).toISOString()
          : null,
        audio_id: u.audioid,
        yt_id: u.videoid,
        speaker: u.speaker,
        language: u.language,
        venue: u.venue,
      },
    };
  }
  return { success: true };
};

export const getRecording = async (id: number) => {
  await verifyAdmin();
  const recRes = await query(
    "SELECT * FROM rsp.recordings WHERE id = $1 LIMIT 1;",
    [id],
  );
  if (recRes.rows.length === 0) throw new Error("Recording not found");
  const rec = recRes.rows[0];
  const matRes = await query(
    "SELECT * FROM rsp.materials WHERE recordingid = $1;",
    [id],
  );
  return {
    ...rec,
    id: Number(rec.id),
    category_id: Number(rec.parentid),
    audio_id: rec.audioid,
    yt_id: rec.videoid,
    recorded_at: rec.recdatetime
      ? new Date(rec.recdatetime).toISOString()
      : null,
    speaker_ids: [],
    lang_ids: [],
    venues_id: null,
    event_id: rec.eventid ? Number(rec.eventid) : null,
    type_id: null,
    materials: matRes.rows.map((m: Record<string, unknown>) => ({
      ...m,
      id: Number(m.id),
      recording_id: Number(m.recordingid),
      storage_key: String(m.uri || m.gdriveid || ""),
    })),
  };
};

export const softDeleteRecording = async (
  id: number,
  categoryId: number,
  categoryUrlPath?: string,
) => {
  await verifyAdmin();
  await trashRecording(id);
  await revalidateRecordingCategory(categoryId, categoryUrlPath);
};

export const restoreRecording = async (id: number) => {
  await verifyAdmin();
  await untrashRecording(id);
  const recRes = await query(
    "SELECT parentid FROM rsp.recordings WHERE id = $1 LIMIT 1;",
    [id],
  );
  if (recRes.rows.length > 0) {
    await revalidateRecordingCategory(Number(recRes.rows[0].parentid));
  }
};

export const reorderRecordings = async (
  items: { id: number; order_ind: number }[],
  categoryUrlPath: string,
) => {
  await verifyAdmin();
  for (const item of items) {
    await query("UPDATE rsp.recordings SET orderind = $1 WHERE id = $2;", [
      item.order_ind,
      item.id,
    ]);
  }
  await revalidateCategoryPaths([categoryUrlPath]);
};

export const prepareRecordingUploadFolders = async (
  categoryId: number,
  recordingTitle: string,
) => {
  await verifyAdmin();
  return prepareRecordingFolders(categoryId, recordingTitle);
};

export const getUploadSessionUrl = async (
  fileName: string,
  mimeType: string,
  clientOrigin?: string,
  categoryId?: number,
  folderId?: string,
) => {
  await verifyAdmin();
  const reqHeaders = await headers();
  const rawOrigin =
    clientOrigin ||
    reqHeaders.get("origin") ||
    reqHeaders.get("referer") ||
    undefined;
  let origin: string | undefined;
  if (rawOrigin) {
    try {
      const parsed = new URL(rawOrigin);
      origin = parsed.origin;
    } catch {
      origin = rawOrigin;
    }
  }
  const { sessionUrl, uniqueFileName } = await createResumableSession(
    fileName,
    mimeType,
    origin,
    categoryId,
    folderId,
  );
  return { sessionUrl, uniqueFileName };
};
