import { Readable } from "node:stream";
import { google } from "googleapis";
import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { query } from "@/lib/db";

// Google Drive API configuration
const CVMS_ROOT_FOLDER_ID =
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
  "1N6jD_rDxSJ7pfl1BmZTNe269h_s3EcfZ";

let cachedAudioRootId: string | null = "1LdVJeB0mr1VVTjOqZV83PX7ui2clckxu";
let cachedImagesFolderId: string | null = "1H6cm8f1DFjtnHP17yTuEHe9hu4VGFpHb";

/**
 * Initialize Google Drive API client using OAuth 2.0 refresh token.
 * Modeled directly after the Voicegurukul drive client implementation.
 */
async function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Drive OAuth credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in environment variables.",
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "urn:ietf:wg:oauth:2.0:oob",
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

/**
 * Find folder by name under a parent folder.
 */
async function findFolder(
  folderName: string,
  parentFolderId: string,
): Promise<string | null> {
  try {
    const drive = await getDriveClient();
    const sanitizedName = folderName.replace(/'/g, "\\'");
    const response = await drive.files.list({
      q: `name = '${sanitizedName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
      pageSize: 1,
    });

    const files = response.data.files;
    if (files && files.length > 0 && files[0]?.id) {
      return files[0].id;
    }
    return null;
  } catch (error: any) {
    console.error("[google-drive] Error finding folder:", error);
    throw new Error(`Failed to find folder: ${error.message}`);
  }
}

/**
 * Create a folder in Google Drive.
 */
async function createFolder(
  folderName: string,
  parentFolderId: string,
): Promise<string> {
  try {
    const drive = await getDriveClient();
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id, name",
    });

    const folderId = response.data.id;
    if (!folderId) {
      throw new Error(
        "Failed to create folder in Google Drive: No ID returned",
      );
    }

    // Make folder accessible
    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    } catch (permErr: any) {
      console.warn(
        "[google-drive] Could not make folder public (continuing):",
        permErr.message,
      );
    }

    return folderId;
  } catch (error: any) {
    console.error("[google-drive] Error creating folder:", error);
    throw new Error(`Failed to create folder: ${error.message}`);
  }
}

/**
 * Ensure a folder exists by name under a parent folder; if not, create it.
 */
async function ensureFolder(
  folderName: string,
  parentFolderId: string,
): Promise<string> {
  const existing = await findFolder(folderName, parentFolderId);
  if (existing) return existing;
  return createFolder(folderName, parentFolderId);
}

/**
 * Get or ensure the 'Images' folder inside CVMS / Radheshyam Das.
 */
async function getOrCreateImagesFolder(): Promise<string> {
  if (cachedImagesFolderId) return cachedImagesFolderId;

  // Ensure 'Radheshyam Das' under CVMS
  if (!cachedAudioRootId) {
    cachedAudioRootId = await ensureFolder(
      "Radheshyam Das",
      CVMS_ROOT_FOLDER_ID,
    );
  }

  cachedImagesFolderId = await ensureFolder("Images", cachedAudioRootId);
  return cachedImagesFolderId;
}

/**
 * Upload a buffer or stream to Google Drive.
 */
async function uploadToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  targetFolderId: string,
): Promise<{
  fileId: string;
  fileName: string;
  webViewLink?: string | null;
  directImageUrl: string;
  thumbnailUrl: string;
}> {
  const drive = await getDriveClient();

  const fileMetadata = {
    name: fileName,
    parents: [targetFolderId],
  };

  const stream = new Readable({
    read() {
      this.push(fileBuffer);
      this.push(null);
    },
  });

  const media = {
    mimeType,
    body: stream,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, webViewLink, webContentLink, thumbnailLink",
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error(
      "Failed to upload file to Google Drive: No file ID returned",
    );
  }

  // Make the file publicly viewable
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  } catch (permError: any) {
    console.warn(
      "[google-drive] Failed to set public permission (continuing):",
      permError.message,
    );
  }

  return {
    fileId,
    fileName: response.data.name || fileName,
    webViewLink: response.data.webViewLink,
    directImageUrl: `https://lh3.googleusercontent.com/d/${fileId}=s1600`,
    thumbnailUrl: `https://lh3.googleusercontent.com/d/${fileId}=s400`,
  };
}

/**
 * POST /api/upload/google-drive
 * Handles file uploads, image optimization, folder creation, and folder searches.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    const role = Number(session?.role || 0);
    if (!session || (role !== 1 && role !== 8)) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const action = (formData.get("action") as string) || "upload";

    // 1. Create Folder
    if (action === "create-folder") {
      const folderName = formData.get("folderName") as string;
      const parentId =
        (formData.get("parentFolderId") as string) || CVMS_ROOT_FOLDER_ID;
      if (!folderName) {
        return NextResponse.json(
          { error: "Folder name is required" },
          { status: 400 },
        );
      }
      const folderId = await createFolder(folderName, parentId);
      return NextResponse.json({ success: true, folderId });
    }

    // 2. Find Folder
    if (action === "find-folder") {
      const folderName = formData.get("folderName") as string;
      const parentId =
        (formData.get("parentFolderId") as string) || CVMS_ROOT_FOLDER_ID;
      if (!folderName) {
        return NextResponse.json(
          { error: "Folder name is required" },
          { status: 400 },
        );
      }
      const folderId = await findFolder(folderName, parentId);
      return NextResponse.json({ success: true, folderId });
    }

    // 3. File / Image Upload
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const description = (formData.get("description") as string) || file.name;
    let targetFolderId = formData.get("folderId") as string;

    // Default folder resolution based on file type
    if (!targetFolderId) {
      if (file.type?.startsWith("image/")) {
        targetFolderId = await getOrCreateImagesFolder();
      } else {
        targetFolderId = await getOrCreateAudioRootFolder();
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename
    const customFileName = formData.get("customFileName") as string;
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const baseName =
      file.name
        .substring(0, file.name.lastIndexOf(".") || file.name.length)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .substring(0, 50) || "upload";
    const safeFileName = customFileName || `${baseName}_${Date.now()}.${ext}`;

    const uploadResult = await uploadToDrive(
      buffer,
      safeFileName,
      file.type || "application/octet-stream",
      targetFolderId,
    );

    // If uploading an image, optionally insert into rsp.images table
    let dbImageId: number | null = null;
    if (file.type?.startsWith("image/")) {
      try {
        const insertRes = await query(
          `INSERT INTO rsp.images (id, description, gdrive_id, url)
           VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM rsp.images), $1, $2, $3)
           RETURNING id;`,
          [description, uploadResult.fileId, uploadResult.directImageUrl],
        );
        if (insertRes.rows.length > 0) {
          dbImageId = Number(insertRes.rows[0].id);
        }
      } catch (dbErr: any) {
        console.warn(
          "[google-drive] DB insert warning (continuing):",
          dbErr.message,
        );
      }
    }

    return NextResponse.json({
      success: true,
      id: dbImageId,
      data: {
        ...uploadResult,
        id: dbImageId,
        uploadedToFolderId: targetFolderId,
      },
    });
  } catch (error: any) {
    console.error("[google-drive] Upload route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to upload file to Google Drive",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/upload/google-drive
 * Lists images stored in the Google Drive Images folder for instant browsing.
 */
export async function GET(_request: NextRequest) {
  try {
    const imagesFolderId = await getOrCreateImagesFolder();
    const drive = await getDriveClient();

    const response = await drive.files.list({
      q: `'${imagesFolderId}' in parents and trashed = false`,
      fields: "files(id, name, webViewLink, thumbnailLink, createdTime)",
      orderBy: "createdTime desc",
      pageSize: 100,
    });

    const files = (response.data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      createdTime: f.createdTime,
      url: `https://lh3.googleusercontent.com/d/${f.id}=s1600`,
      thumbnailUrl: `https://lh3.googleusercontent.com/d/${f.id}=s400`,
    }));

    return NextResponse.json({ success: true, files });
  } catch (error: any) {
    console.error("[google-drive] Error listing files:", error);
    return NextResponse.json(
      { success: false, error: error.message, files: [] },
      { status: 500 },
    );
  }
}
