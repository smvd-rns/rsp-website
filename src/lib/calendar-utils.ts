export const DEFAULT_CALENDAR_URL =
  "https://drive.google.com/file/d/12wZ7WHHnlEy1u8uLw_Z5Kn6flrCVJ12P/view";

export interface CalendarViewerUrls {
  fileId: string;
  rawUrl: string;
  embedUrl: string;
  downloadUrl: string;
  viewUrl: string;
}

/**
 * Extracts the file/document ID from any Google Drive or Google Docs URL
 * and formats it into embedding, direct view, and download URLs.
 */
export const getCalendarViewerUrls = (url?: string | null): CalendarViewerUrls => {
  const trimmed = (url || DEFAULT_CALENDAR_URL).trim();

  // Extract ID from /d/ID or ?id=ID
  const driveMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const fileId = driveMatch?.[1] || idParamMatch?.[1] || "";

  let embedUrl = trimmed;
  let downloadUrl = trimmed;
  let viewUrl = trimmed;

  if (fileId) {
    if (trimmed.includes("docs.google.com/document")) {
      embedUrl = `https://docs.google.com/document/d/${fileId}/preview`;
      downloadUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
      viewUrl = `https://docs.google.com/document/d/${fileId}/view`;
    } else if (trimmed.includes("docs.google.com/spreadsheets")) {
      embedUrl = `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
      downloadUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
      viewUrl = `https://docs.google.com/spreadsheets/d/${fileId}/view`;
    } else {
      // Standard Google Drive file view
      embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
    }
  } else if (trimmed.includes("/view")) {
    embedUrl = trimmed.replace(/\/view(\?.*)?$/, "/preview");
  }

  return {
    fileId,
    rawUrl: trimmed,
    embedUrl,
    downloadUrl,
    viewUrl,
  };
};
