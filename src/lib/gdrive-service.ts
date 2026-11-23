import { query } from "./db";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;
let cachedCvmsFolderId: string | null = null;
let cachedAudioRootFolderId: string | null = null;
let cachedVideoRootFolderId: string | null = null;
let cachedImagesFolderId: string | null = null;
let cachedQueryAttachmentsFolderId: string | null = null;

/**
 * Obtain a fresh Google Drive access token using refresh token.
 */
export const getGoogleDriveAccessToken = async (): Promise<string> => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google Drive credentials in environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN).",
    );
  }

  // Reuse cached token if valid for at least another 60 seconds
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(
      "[gdrive-service] Failed to refresh Google access token:",
      errorText,
    );
    throw new Error(`Failed to refresh Google access token: ${errorText}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
};

/**
 * Helper to make authenticated requests to Google Drive API.
 */
const driveFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await getGoogleDriveAccessToken();
  const url = path.startsWith("http")
    ? path
    : `https://www.googleapis.com/drive/v3${path}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(
      `[gdrive-service] API Error ${res.status} on ${url}:`,
      errorText,
    );
    throw new Error(`Google Drive API error (${res.status}): ${errorText}`);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return {} as T;
  }

  return (await res.json()) as T;
};

/**
 * Find a folder by name inside a specific parent folder.
 */
export const findFolder = async (
  name: string,
  parentId?: string,
): Promise<{ id: string; name: string } | null> => {
  const safeName = name.replace(/'/g, "\\'");
  let query = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query,
  )}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const res = await driveFetch<{ files?: { id: string; name: string }[] }>(url);
  if (res.files && res.files.length > 0) {
    return res.files[0];
  }
  return null;
};

/**
 * Ensure a folder exists inside parentId; if missing, creates it.
 */
export const ensureFolder = async (
  name: string,
  parentId?: string,
): Promise<{ id: string; name: string }> => {
  const existing = await findFolder(name, parentId);
  if (existing) {
    return existing;
  }

  const bodyPayload: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) {
    bodyPayload.parents = [parentId];
  }

  const created = await driveFetch<{ id: string; name: string }>(
    "/files?supportsAllDrives=true",
    {
      method: "POST",
      body: JSON.stringify(bodyPayload),
    },
  );

  return { id: created.id, name };
};

/**
 * Find or create the top-level 'CVMS' container folder in Google Drive.
 */
export const getOrCreateCvmsFolder = async (): Promise<string> => {
  if (cachedCvmsFolderId) return cachedCvmsFolderId;

  const configuredRootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (configuredRootId?.trim()) {
    cachedCvmsFolderId = configuredRootId.trim();
    return cachedCvmsFolderId;
  }

  const folder = await ensureFolder("CVMS");
  cachedCvmsFolderId = folder.id;
  return cachedCvmsFolderId;
};

/**
 * Find or create 'Radheshyam Das' folder inside 'CVMS'.
 * Stores all audio discourses, materials, images, and category hierarchies.
 */
export const getOrCreateAudioRootFolder = async (): Promise<string> => {
  if (cachedAudioRootFolderId) return cachedAudioRootFolderId;
  const cvmsId = await getOrCreateCvmsFolder();
  const folder = await ensureFolder("Radheshyam Das", cvmsId);
  cachedAudioRootFolderId = folder.id;
  return cachedAudioRootFolderId;
};

/**
 * Find or create 'Radheshyam Das Videos' folder inside 'CVMS'.
 * Mirrors all category and recording folder structures for video assets.
 */
export const getOrCreateVideoRootFolder = async (): Promise<string> => {
  if (cachedVideoRootFolderId) return cachedVideoRootFolderId;
  const cvmsId = await getOrCreateCvmsFolder();
  const folder = await ensureFolder("Radheshyam Das Videos", cvmsId);
  cachedVideoRootFolderId = folder.id;
  return cachedVideoRootFolderId;
};

/**
 * Ensure a dedicated Images folder exists under 'Radheshyam Das'.
 */
export const getOrCreateImagesFolder = async (): Promise<string> => {
  if (cachedImagesFolderId) return cachedImagesFolderId;
  const audioRootId = await getOrCreateAudioRootFolder();
  const folder = await ensureFolder("Images", audioRootId);
  cachedImagesFolderId = folder.id;
  return cachedImagesFolderId;
};

/**
 * Ensure a dedicated Query Attachments folder exists under 'Radheshyam Das'.
 */
export const getOrCreateQueryAttachmentsFolder = async (): Promise<string> => {
  if (cachedQueryAttachmentsFolderId) return cachedQueryAttachmentsFolderId;
  const audioRootId = await getOrCreateAudioRootFolder();
  const folder = await ensureFolder("Query Attachments", audioRootId);
  cachedQueryAttachmentsFolderId = folder.id;
  return cachedQueryAttachmentsFolderId;
};

/**
 * Recursively resolves the folder hierarchy for a category across BOTH
 * 'Radheshyam Das' (audio/materials) AND 'Radheshyam Das Videos' (videos).
 * Returns { folderId, videoFolderId }.
 */
export const resolveCategoryDualFolderIds = async (
  categoryId: number,
): Promise<{ folderId: string; videoFolderId: string }> => {
  const audioRootId = await getOrCreateAudioRootFolder();
  const videoRootId = await getOrCreateVideoRootFolder();

  try {
    const catRes = await query(
      "SELECT id, name, path, gdriveid, videogdriveid FROM rsp.categories WHERE id = $1 LIMIT 1;",
      [categoryId],
    );
    const category = catRes.rows[0];

    if (!category) {
      return { folderId: audioRootId, videoFolderId: videoRootId };
    }

    // Fast-path: If the category already has its Google Drive folders tracked, reuse them directly!
    if (category.gdriveid && category.videogdriveid) {
      return {
        folderId: category.gdriveid,
        videoFolderId: category.videogdriveid,
      };
    }

    const pathStr = (category.path as string) || "";
    const ancestorIds = pathStr
      .split(".")
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => !Number.isNaN(n) && n > 0);

    let ancestorNames: string[] = [];
    if (ancestorIds.length > 0) {
      const ancRes = await query(
        "SELECT id, name FROM rsp.categories WHERE id = ANY($1::bigint[]);",
        [ancestorIds],
      );

      if (ancRes.rows && ancRes.rows.length > 0) {
        const ancestorMap = new Map(
          ancRes.rows.map((a: { id: number | string; name: string }) => [
            Number(a.id),
            a.name,
          ]),
        );
        ancestorNames = ancestorIds
          .map((id) => ancestorMap.get(id))
          .filter((name): name is string => Boolean(name));
      }
    }

    // Sequence of folder names from root down to this category
    const folderNames = [...ancestorNames, category.name];

    // 1. Build / verify hierarchy in 'Radheshyam Das' (audio & materials)
    let currentAudioParent = audioRootId;
    for (const name of folderNames) {
      const folder = await ensureFolder(name, currentAudioParent);
      currentAudioParent = folder.id;
    }

    // 2. Build / verify hierarchy in 'Radheshyam Das Videos' (videos mirror)
    let currentVideoParent = videoRootId;
    for (const name of folderNames) {
      const folder = await ensureFolder(name, currentVideoParent);
      currentVideoParent = folder.id;
    }

    // Save newly resolved folder IDs to rsp.categories for future zero-creation lookups
    if (currentAudioParent && currentVideoParent) {
      await query(
        "UPDATE rsp.categories SET gdriveid = COALESCE(gdriveid, $1), videogdriveid = COALESCE(videogdriveid, $2) WHERE id = $3;",
        [currentAudioParent, currentVideoParent, categoryId],
      );
    }

    return {
      folderId: currentAudioParent,
      videoFolderId: currentVideoParent,
    };
  } catch (err) {
    console.error(
      `[gdrive-service] Error resolving dual folders for category ${categoryId}:`,
      err,
    );
    return { folderId: audioRootId, videoFolderId: videoRootId };
  }
};

/**
 * Resolves or creates dedicated dual folders for a recording:
 * - 'rec_<recordingTitle>' inside category folder in 'Radheshyam Das' (audio & study materials)
 * - 'rec_<recordingTitle>' inside category folder in 'Radheshyam Das Videos' (videos mirror)
 */
export const resolveRecordingDualFolderIds = async (
  categoryId: number,
  recordingTitle: string,
  existingFolderId?: string | null,
  existingVideoFolderId?: string | null,
): Promise<{ folderId: string; videoFolderId: string }> => {
  const { folderId: catAudioFolderId, videoFolderId: catVideoFolderId } =
    await resolveCategoryDualFolderIds(categoryId);

  const cleanTitle = recordingTitle.trim().replace(/[/\\?%*:|"<>]/g, " ");
  const recFolderName = `rec_${cleanTitle}`;

  let recAudioFolderId = existingFolderId || null;
  let recVideoFolderId = existingVideoFolderId || null;

  if (recAudioFolderId && catAudioFolderId) {
    await moveFileToFolder(recAudioFolderId, catAudioFolderId);
  } else if (!recAudioFolderId && catAudioFolderId) {
    const folder = await ensureFolder(recFolderName, catAudioFolderId);
    recAudioFolderId = folder.id;
  }

  if (recVideoFolderId && catVideoFolderId) {
    await moveFileToFolder(recVideoFolderId, catVideoFolderId);
  } else if (!recVideoFolderId && catVideoFolderId) {
    const videoFolder = await ensureFolder(recFolderName, catVideoFolderId);
    recVideoFolderId = videoFolder.id;
  }

  return {
    folderId: recAudioFolderId || catAudioFolderId,
    videoFolderId: recVideoFolderId || catVideoFolderId,
  };
};

/**
 * Initiates a Google Drive Resumable Upload Session directly.
 */
export const createDriveResumableUploadSession = async (
  fileName: string,
  mimeType: string,
  origin?: string,
  parentFolderId?: string,
): Promise<{ sessionUrl: string; uniqueFileName: string }> => {
  const token = await getGoogleDriveAccessToken();
  const targetParent = parentFolderId || (await getOrCreateAudioRootFolder());

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": mimeType || "application/octet-stream",
  };

  if (origin) {
    headers.Origin = origin;
  }

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: fileName,
        parents: [targetParent],
      }),
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error(
      "[gdrive-service] Failed to create resumable upload session:",
      errorText,
    );
    throw new Error(
      `Failed to create Google Drive resumable upload session (${res.status}): ${errorText}`,
    );
  }

  const sessionUrl = res.headers.get("Location");
  if (!sessionUrl) {
    throw new Error(
      "Google Drive did not return a resumable session Location header.",
    );
  }

  return { sessionUrl, uniqueFileName: fileName };
};

/**
 * Move or add a file/folder to a parent folder in Google Drive.
 */
export const moveFileToFolder = async (
  fileId: string,
  newParentId: string,
): Promise<void> => {
  try {
    const file = await driveFetch<{ parents?: string[] }>(
      `/files/${fileId}?fields=parents&supportsAllDrives=true`,
    );

    const parents = file.parents || [];
    if (parents.includes(newParentId)) {
      return;
    }

    const oldParents = parents.join(",");
    let patchUrl = `/files/${fileId}?addParents=${newParentId}&supportsAllDrives=true`;
    if (oldParents) {
      patchUrl += `&removeParents=${oldParents}`;
    }

    await driveFetch(patchUrl, {
      method: "PATCH",
    });
  } catch (err) {
    console.warn(
      `[gdrive-service] Failed to move file ${fileId} to ${newParentId}:`,
      err,
    );
  }
};

/**
 * Rename a file or folder in Google Drive.
 */
export const renameDriveItem = async (
  itemId: string,
  newName: string,
): Promise<void> => {
  await driveFetch(`/files/${itemId}?supportsAllDrives=true`, {
    method: "PATCH",
    body: JSON.stringify({ name: newName }),
  });
};

/**
 * Trash an item in Google Drive.
 */
export const trashDriveItemDirect = async (
  itemId: string,
): Promise<{ success: boolean }> => {
  await driveFetch(`/files/${itemId}?supportsAllDrives=true`, {
    method: "PATCH",
    body: JSON.stringify({ trashed: true }),
  });
  return { success: true };
};

/**
 * Untrash an item in Google Drive.
 */
export const untrashDriveItemDirect = async (
  itemId: string,
): Promise<{ success: boolean }> => {
  await driveFetch(`/files/${itemId}?supportsAllDrives=true`, {
    method: "PATCH",
    body: JSON.stringify({ trashed: false }),
  });
  return { success: true };
};

/**
 * Permanently delete a file or folder in Google Drive.
 */
export const deleteDriveItemDirect = async (
  itemId: string,
): Promise<{ success: boolean }> => {
  await driveFetch(`/files/${itemId}?supportsAllDrives=true`, {
    method: "DELETE",
  });
  return { success: true };
};
