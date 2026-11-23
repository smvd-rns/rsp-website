import { query } from "./db";
import {
  createDriveResumableUploadSession,
  deleteDriveItemDirect,
  getOrCreateAudioRootFolder,
  getOrCreateImagesFolder,
  getOrCreateQueryAttachmentsFolder,
  getOrCreateVideoRootFolder,
  moveFileToFolder,
  renameDriveItem,
  resolveCategoryDualFolderIds,
  resolveRecordingDualFolderIds,
  trashDriveItemDirect,
  untrashDriveItemDirect,
} from "./gdrive-service";
import { generateM2MToken } from "./jwt";

export interface SyncCategoryFoldersRequest {
  id: number;
  parent_id?: number;
  name: string;
  nameChanged?: boolean;
  parentChanged?: boolean;
  existingFolderId?: string | null;
  existingVideoFolderId?: string | null;
}

export interface SyncCategoryFoldersResponse {
  success: boolean;
  metadata: {
    folderId: string;
    videoFolderId: string;
  };
}

export interface ProcessRecordingUploadsRequest {
  recordingId: number;
  categoryId: number;
  videoGdriveId?: string;
  audios: {
    id: string;
    fileName: string;
    mimeType: string;
    deleted?: boolean;
  }[];
  materials: {
    id: string;
    fileName: string;
    mimeType: string;
    deleted?: boolean;
    is_generic?: boolean;
  }[];
}

export interface ProcessRecordingUploadsResponse {
  success: boolean;
  metadata: {
    folderId: string;
    videoFolderId: string;
    audios?: {
      id: string;
      fileName: string;
      mimeType: string;
    }[];
    materials?: {
      id: string;
      fileName: string;
      mimeType: string;
    }[];
  };
}

export interface ClearTrashResponse {
  success: boolean;
  deletedDriveCount?: number;
  deletedRecordingsCount?: number;
  deletedCategoriesCount?: number;
  failedDriveItems?: Array<{ id: string; name: string; error: string }>;
}

const isGoogleDriveDirectEnabled = (): boolean => {
  return Boolean(
    process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET,
  );
};

const callUploadService = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const endpoint = process.env.UPLOAD_SERVICE_ENDPOINT;
  if (!endpoint) {
    console.error(
      "[upload-service] UPLOAD_SERVICE_ENDPOINT is missing from environment variables.",
    );
    throw new Error("UPLOAD_SERVICE_ENDPOINT is not configured.");
  }

  const token = await generateM2MToken();
  const url = `${endpoint.replace(/\/$/, "")}${path}`;

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (fetchErr) {
    console.error(
      `[upload-service] fetch to ${url} failed with error:`,
      fetchErr,
    );
    throw fetchErr;
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[upload-service] Error (${res.status}): ${errText}`);
    throw new Error(`Upload service error (${res.status}): ${errText}`);
  }

  return (await res.json()) as T;
};

export const createResumableSession = async (
  fileName: string,
  mimeType: string,
  origin?: string,
  categoryId?: number,
  folderId?: string,
): Promise<{ sessionUrl: string; uniqueFileName: string }> => {
  if (isGoogleDriveDirectEnabled()) {
    let targetFolderId: string | undefined = folderId;
    if (!targetFolderId) {
      if (categoryId) {
        const dualFolders = await resolveCategoryDualFolderIds(categoryId);
        targetFolderId = dualFolders.folderId;
      } else {
        targetFolderId = await getOrCreateAudioRootFolder();
      }
    }
    return createDriveResumableUploadSession(
      fileName,
      mimeType,
      origin,
      targetFolderId,
    );
  }

  return callUploadService<{ sessionUrl: string; uniqueFileName: string }>(
    "/api/files/upload-session",
    {
      method: "POST",
      body: JSON.stringify({ fileName, mimeType, origin }),
    },
  );
};

export const createQueryAttachmentUploadSession = async (
  fileName: string,
  mimeType: string,
  origin?: string,
): Promise<{ sessionUrl: string; uniqueFileName: string }> => {
  if (isGoogleDriveDirectEnabled()) {
    const folderId = await getOrCreateQueryAttachmentsFolder();
    return createDriveResumableUploadSession(
      fileName,
      mimeType,
      origin,
      folderId,
    );
  }

  return callUploadService<{ sessionUrl: string; uniqueFileName: string }>(
    "/api/files/query-attachment-session",
    {
      method: "POST",
      body: JSON.stringify({ fileName, mimeType, origin }),
    },
  );
};

export const resolveQueryAttachmentFileId = async (
  fileName: string,
): Promise<{ fileId: string | null }> => {
  if (isGoogleDriveDirectEnabled()) {
    try {
      const folderId = await getOrCreateQueryAttachmentsFolder();
      const safeName = fileName.replace(/'/g, "\\'");
      const query = `name = '${safeName}' and '${folderId}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query,
      )}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

      const token = await (
        await import("./gdrive-service")
      ).getGoogleDriveAccessToken();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          return { fileId: data.files[0].id };
        }
      }
    } catch (err) {
      console.warn(
        "[upload-service] Error resolving query attachment file id:",
        err,
      );
    }
    return { fileId: null };
  }

  return callUploadService<{ fileId: string | null }>(
    "/api/files/resolve-query-attachment",
    {
      method: "POST",
      body: JSON.stringify({ fileName }),
    },
  );
};

export const createImageUploadSession = async (
  fileName: string,
  mimeType: string,
  origin?: string,
): Promise<{ sessionUrl: string }> => {
  if (isGoogleDriveDirectEnabled()) {
    const folderId = await getOrCreateImagesFolder();
    const res = await createDriveResumableUploadSession(
      fileName,
      mimeType,
      origin,
      folderId,
    );
    return { sessionUrl: res.sessionUrl };
  }

  return callUploadService<{ sessionUrl: string }>("/api/files/image-session", {
    method: "POST",
    body: JSON.stringify({ fileName, mimeType, origin }),
  });
};

export const syncCategoryFolders = async (
  data: SyncCategoryFoldersRequest,
): Promise<SyncCategoryFoldersResponse> => {
  if (isGoogleDriveDirectEnabled()) {
    try {
      let folderId = data.existingFolderId;
      let videoFolderId = data.existingVideoFolderId;

      // Only resolve from hierarchy if existing folder IDs are not known
      if (!folderId || !videoFolderId) {
        const dual = await resolveCategoryDualFolderIds(data.id);
        folderId = folderId || dual.folderId;
        videoFolderId = videoFolderId || dual.videoFolderId;
      }

      // If category name changed, rename the EXISTING folders in both Radheshyam Das & Radheshyam Das Videos
      if (data.nameChanged && data.name) {
        if (folderId) await renameDriveItem(folderId, data.name);
        if (videoFolderId) await renameDriveItem(videoFolderId, data.name);
      }

      // If category parent changed, move the EXISTING folders in both trees (to new parent or to root)
      if (data.parentChanged) {
        if (data.parent_id) {
          const parentDual = await resolveCategoryDualFolderIds(data.parent_id);
          if (folderId && parentDual.folderId) {
            await moveFileToFolder(folderId, parentDual.folderId);
          }
          if (videoFolderId && parentDual.videoFolderId) {
            await moveFileToFolder(videoFolderId, parentDual.videoFolderId);
          }
        } else {
          const rootAudioId = await getOrCreateAudioRootFolder();
          const rootVideoId = await getOrCreateVideoRootFolder();
          if (folderId && rootAudioId) {
            await moveFileToFolder(folderId, rootAudioId);
          }
          if (videoFolderId && rootVideoId) {
            await moveFileToFolder(videoFolderId, rootVideoId);
          }
        }
      }

      return {
        success: true,
        metadata: {
          folderId: folderId || "",
          videoFolderId: videoFolderId || "",
        },
      };
    } catch (err) {
      console.error(
        `[upload-service] Direct syncCategoryFolders error for ${data.id}:`,
        err,
      );
      return {
        success: false,
        metadata: {
          folderId: "",
          videoFolderId: "",
        },
      };
    }
  }

  return callUploadService<SyncCategoryFoldersResponse>(
    "/api/categories/sync-folders",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
};

export const prepareRecordingFolders = async (
  categoryId: number,
  title: string,
) => {
  if (isGoogleDriveDirectEnabled()) {
    return resolveRecordingDualFolderIds(categoryId, title);
  }
  return { folderId: "", videoFolderId: "" };
};

export const processRecordingUploads = async (
  data: ProcessRecordingUploadsRequest,
): Promise<ProcessRecordingUploadsResponse> => {
  if (isGoogleDriveDirectEnabled()) {
    try {
      let recordingName = "";
      let existingGdriveId: string | null = null;
      let existingVideoGdriveId: string | null = null;

      if (data.recordingId) {
        const recRes = await query(
          "SELECT name, gdriveid, videogdriveid FROM rsp.recordings WHERE id = $1 LIMIT 1;",
          [data.recordingId],
        );
        if (recRes.rows.length > 0) {
          recordingName = recRes.rows[0].name || "";
          existingGdriveId = recRes.rows[0].gdriveid || null;
          existingVideoGdriveId = recRes.rows[0].videogdriveid || null;
        }
      }

      const { folderId, videoFolderId } = await resolveRecordingDualFolderIds(
        data.categoryId,
        recordingName || `rec_${data.recordingId}`,
        existingGdriveId,
        existingVideoGdriveId,
      );

      // Save folder IDs on rsp.recordings
      if (data.recordingId && folderId) {
        await query(
          "UPDATE rsp.recordings SET gdriveid = COALESCE(gdriveid, $1), videogdriveid = COALESCE(videogdriveid, $2) WHERE id = $3;",
          [folderId, videoFolderId, data.recordingId],
        );
      }

      // Move and rename audio files into rec_<title> folder inside Radheshyam Das, or trash if deleted
      for (const aud of data.audios || []) {
        if (aud.id && !aud.id.startsWith("http")) {
          if (aud.deleted) {
            try {
              await trashDriveItemDirect(aud.id);
            } catch (tErr) {
              console.warn(
                `[upload-service] Could not trash audio ${aud.id} in Google Drive:`,
                tErr,
              );
            }
          } else {
            await moveFileToFolder(aud.id, folderId);
            if (aud.fileName) {
              try {
                await renameDriveItem(aud.id, aud.fileName);
              } catch (renameErr) {
                console.warn(
                  `[upload-service] Could not rename audio file ${aud.id} on Google Drive:`,
                  renameErr,
                );
              }
            }
          }
        }
      }

      // Rename recording folders if title changed and folder already exists
      if (recordingName && existingGdriveId) {
        const cleanTitle = recordingName.trim().replace(/[/\\?%*:|"<>]/g, " ");
        try {
          await renameDriveItem(existingGdriveId, `rec_${cleanTitle}`);
        } catch (fErr) {
          console.warn("[upload-service] Could not rename rec folder:", fErr);
        }
      }
      if (recordingName && existingVideoGdriveId) {
        const cleanTitle = recordingName.trim().replace(/[/\\?%*:|"<>]/g, " ");
        try {
          await renameDriveItem(existingVideoGdriveId, `rec_${cleanTitle}`);
        } catch (vfErr) {
          console.warn(
            "[upload-service] Could not rename rec video folder:",
            vfErr,
          );
        }
      }

      // Move material files into rec_<title> folder inside Radheshyam Das, or trash if deleted
      for (const mat of data.materials || []) {
        if (mat.id && !mat.id.startsWith("http")) {
          if (mat.deleted) {
            try {
              await trashDriveItemDirect(mat.id);
            } catch (tErr) {
              console.warn(
                `[upload-service] Could not trash material ${mat.id} in Google Drive:`,
                tErr,
              );
            }
          } else {
            await moveFileToFolder(mat.id, folderId);
          }
        }
      }

      // Move video file into rec_<title> folder inside Radheshyam Das Videos if present
      if (
        data.videoGdriveId &&
        videoFolderId &&
        !data.videoGdriveId.startsWith("http")
      ) {
        await moveFileToFolder(data.videoGdriveId, videoFolderId);
      }

      return {
        success: true,
        metadata: {
          folderId,
          videoFolderId,
          audios: data.audios,
          materials: data.materials,
        },
      };
    } catch (err) {
      console.error(
        "[upload-service] Direct processRecordingUploads error:",
        err,
      );
      return {
        success: false,
        metadata: {
          folderId: "",
          videoFolderId: "",
        },
      };
    }
  }

  return callUploadService<ProcessRecordingUploadsResponse>(
    "/api/recordings/process",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
};

export const trashCategory = async (id: number) => {
  if (isGoogleDriveDirectEnabled()) {
    try {
      const { folderId, videoFolderId } =
        await resolveCategoryDualFolderIds(id);
      if (folderId) await trashDriveItemDirect(folderId);
      if (videoFolderId) await trashDriveItemDirect(videoFolderId);
    } catch (err) {
      console.warn(
        `[upload-service] Failed to trash category dual folders ${id}:`,
        err,
      );
    }
    return { success: true };
  }

  return callUploadService(`/api/categories/trash`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
};

export const untrashCategory = async (id: number) => {
  if (isGoogleDriveDirectEnabled()) {
    try {
      const { folderId, videoFolderId } =
        await resolveCategoryDualFolderIds(id);
      if (folderId) await untrashDriveItemDirect(folderId);
      if (videoFolderId) await untrashDriveItemDirect(videoFolderId);
    } catch (err) {
      console.warn(
        `[upload-service] Failed to untrash category dual folders ${id}:`,
        err,
      );
    }
    return { success: true };
  }

  return callUploadService(`/api/categories/untrash`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
};

export const trashRecording = async (id: number) => {
  if (isGoogleDriveDirectEnabled()) {
    return { success: true };
  }

  return callUploadService(`/api/recordings/trash`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
};

export const untrashRecording = async (id: number) => {
  if (isGoogleDriveDirectEnabled()) {
    return { success: true };
  }

  return callUploadService(`/api/recordings/untrash`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
};

export const trashDriveItem = async (
  id: string,
): Promise<{ success: boolean }> => {
  if (isGoogleDriveDirectEnabled()) {
    return trashDriveItemDirect(id);
  }

  return callUploadService<{ success: boolean }>(`/api/files/${id}/trash`, {
    method: "POST",
  });
};

export const untrashDriveItem = async (
  id: string,
): Promise<{ success: boolean }> => {
  if (isGoogleDriveDirectEnabled()) {
    return untrashDriveItemDirect(id);
  }

  return callUploadService<{ success: boolean }>(`/api/files/${id}/untrash`, {
    method: "POST",
  });
};

export const deleteDriveFolder = async (
  id: string,
): Promise<{ success: boolean }> => {
  if (isGoogleDriveDirectEnabled()) {
    return deleteDriveItemDirect(id);
  }

  return callUploadService<{ success: boolean }>(`/api/folders/${id}`, {
    method: "DELETE",
  });
};

export const deleteCategoryPermanently = async (
  id: number,
): Promise<{ success: boolean }> => {
  if (isGoogleDriveDirectEnabled()) {
    try {
      const { folderId, videoFolderId } =
        await resolveCategoryDualFolderIds(id);
      if (folderId) await deleteDriveItemDirect(folderId);
      if (videoFolderId) await deleteDriveItemDirect(videoFolderId);
    } catch (err) {
      console.warn(
        `[upload-service] Failed to permanently delete category dual folders ${id}:`,
        err,
      );
    }
    return { success: true };
  }

  return callUploadService<{ success: boolean }>(`/api/categories/${id}`, {
    method: "DELETE",
  });
};

export const deleteRecordingPermanently = async (
  id: number,
): Promise<{ success: boolean }> => {
  if (isGoogleDriveDirectEnabled()) {
    return { success: true };
  }

  return callUploadService<{ success: boolean }>(`/api/recordings/${id}`, {
    method: "DELETE",
  });
};

export const clearTrashService = async (): Promise<ClearTrashResponse> => {
  if (isGoogleDriveDirectEnabled()) {
    return {
      success: true,
      deletedDriveCount: 0,
      deletedRecordingsCount: 0,
      deletedCategoriesCount: 0,
    };
  }

  return callUploadService<ClearTrashResponse>(`/api/trash/clear`, {
    method: "POST",
  });
};
