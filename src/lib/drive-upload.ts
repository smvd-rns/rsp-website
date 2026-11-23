import axios from "axios";
import { getImageUploadSessionUrl } from "@/app/actions/image-actions";
import {
  getQueryAttachmentUploadSession,
  resolveQueryAttachment,
} from "@/app/actions/query-actions";
import { getUploadSessionUrl } from "@/app/actions/recording-actions";

const performDriveUpload = async (
  sessionUrl: string,
  file: File,
  onProgress?: (percent: number, loaded?: number, total?: number) => void,
): Promise<string | null> => {
  let uploadPercent = 0;
  try {
    const response = await axios.put(sessionUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          uploadPercent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(uploadPercent, progressEvent.loaded, progressEvent.total);
        }
      },
    });
    if (response.data?.id) {
      return response.data.id;
    }
  } catch (err) {
    if (
      uploadPercent >= 100 &&
      err instanceof Error &&
      err.message.toLowerCase().includes("network")
    ) {
      console.warn(
        "Ignoring network error after upload completed at 100% (likely CORS):",
        err,
      );
    } else {
      throw err;
    }
  }
  return null;
};

export const uploadFileToDrive = async (
  file: File,
  onProgress?: (percent: number, loaded?: number, total?: number) => void,
  categoryId?: number,
  folderId?: string,
  customFileName?: string,
): Promise<string> => {
  const uploadName = customFileName || file.name;
  try {
    const clientOrigin =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const { sessionUrl, uniqueFileName } = await getUploadSessionUrl(
      uploadName,
      file.type || "application/octet-stream",
      clientOrigin,
      categoryId,
      folderId,
    );

    const fileId = await performDriveUpload(sessionUrl, file, onProgress);
    if (fileId) return fileId;
    if (uniqueFileName) return uniqueFileName;
  } catch (err) {
    console.warn(
      "Resumable drive upload session failed, falling back to server upload route:",
      err,
    );
  }

  // Robust server-side upload fallback (zero CORS issues)
  const formData = new FormData();
  formData.append("file", file);
  formData.append("description", uploadName);
  if (customFileName) {
    formData.append("customFileName", customFileName);
  }
  if (folderId) {
    formData.append("folderId", folderId);
  }

  const res = await axios.post("/api/upload/google-drive", formData, {
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        onProgress(percent, progressEvent.loaded, progressEvent.total);
      }
    },
  });

  if (res.data?.data?.fileId) {
    return res.data.data.fileId;
  }
  throw new Error(res.data?.error || `Failed to upload ${file.name}`);
};

export const uploadQueryAttachmentToDrive = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> => {
  const clientOrigin =
    typeof window !== "undefined" ? window.location.origin : undefined;
  const { sessionUrl, uniqueFileName } = await getQueryAttachmentUploadSession(
    file.name,
    file.type,
    clientOrigin,
  );

  const fileId = await performDriveUpload(sessionUrl, file, onProgress);
  if (fileId) return fileId;

  // Fallback: resolve real Google Drive file ID if CORS obscured the response body
  try {
    const res = await resolveQueryAttachment(uniqueFileName);
    if (res?.fileId) {
      return res.fileId;
    }
  } catch (err) {
    console.warn("Failed to resolve query attachment file ID:", err);
  }

  return uniqueFileName;
};

export const uploadImageToDrive = async (
  blob: Blob,
  fileName: string,
  mimeType: string,
  onProgress?: (percent: number) => void,
): Promise<string> => {
  const clientOrigin =
    typeof window !== "undefined" ? window.location.origin : undefined;
  const { sessionUrl } = await getImageUploadSessionUrl(
    fileName,
    mimeType,
    clientOrigin,
  );

  const file = new File([blob], fileName, { type: mimeType });
  const fileId = await performDriveUpload(sessionUrl, file, onProgress);
  return fileId || fileName;
};
