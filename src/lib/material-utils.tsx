import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Presentation,
} from "lucide-react";
import type { Material } from "@/types";

export const sanitizeFileName = (name: string): string => {
  return name.replace(/[/\\?%*:|"<>]/g, "_").trim();
};

export const isMaterialLink = (uri?: string | null): boolean => {
  if (!uri) return false;
  return /^https?:\/\//i.test(uri.trim());
};

export const mimeToExtension = (mime?: string | null): string => {
  if (!mime) return "";
  const cleanMime = mime.split(";")[0]?.trim().toLowerCase();
  switch (cleanMime) {
    // Documents
    case "application/pdf":
      return ".pdf";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return ".pptx";
    case "application/vnd.ms-powerpoint":
      return ".ppt";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    case "application/msword":
      return ".doc";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return ".xlsx";
    case "application/vnd.ms-excel":
      return ".xls";
    case "application/epub+zip":
      return ".epub";
    case "text/plain":
      return ".txt";
    case "text/html":
      return ".html";
    case "text/csv":
      return ".csv";
    case "text/markdown":
    case "text/x-markdown":
      return ".md";
    // Audio
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/wav":
    case "audio/x-wav":
      return ".wav";
    case "audio/mp4":
    case "audio/m4a":
    case "audio/x-m4a":
      return ".m4a";
    case "audio/aac":
      return ".aac";
    case "audio/ogg":
      return ".ogg";
    case "audio/flac":
      return ".flac";
    // Video
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/quicktime":
      return ".mov";
    case "video/x-msvideo":
      return ".avi";
    case "video/x-matroska":
      return ".mkv";
    case "video/3gpp":
      return ".3gp";
    // Images
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    // Archives
    case "application/zip":
    case "application/x-zip-compressed":
      return ".zip";
    case "application/x-rar-compressed":
    case "application/vnd.rar":
      return ".rar";
    case "application/x-7z-compressed":
      return ".7z";
    case "application/x-tar":
    case "application/gzip":
      return ".tar.gz";
    default:
      return "";
  }
};

export const normalizeTypeToExtension = (type?: string | null): string => {
  if (!type) return "";
  const clean = type.trim().toLowerCase();
  if (clean.includes("/")) {
    return mimeToExtension(clean);
  }
  const cleanExt = clean.replace(/^\.+/, "");
  // Only accept valid single extension strings (2-5 alphanumeric chars)
  if (/^[a-z0-9]{2,5}$/.test(cleanExt)) {
    // Avoid generic category names
    if (
      [
        "application",
        "video",
        "audio",
        "text",
        "image",
        "binary",
        "file",
        "octet",
      ].includes(cleanExt)
    ) {
      return "";
    }
    return `.${cleanExt}`;
  }
  return "";
};

export const getMaterialExtension = (mat: Material): string => {
  const uri = mat.uri || "";
  const match = uri.match(/\.([a-zA-Z0-9]{2,5})(?:[?#]|$)/);
  if (match?.[1]) {
    const ext = match[1].toLowerCase();
    if (
      !/^\d+$/.test(ext) &&
      (!["com", "org", "net", "io", "html", "php"].includes(ext) ||
        ext === "pdf")
    ) {
      return `.${ext}`;
    }
  }
  const nameMatch = mat.name.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (nameMatch?.[1]) {
    const ext = nameMatch[1].toLowerCase();
    if (!/^\d+$/.test(ext)) {
      return `.${ext}`;
    }
  }
  if (mat.type) {
    const ext = normalizeTypeToExtension(mat.type);
    if (ext) return ext;
  }
  return "";
};

export const guessExtensionFromBytesAndMime = (
  data: Uint8Array,
  mimeType?: string,
  mat?: Material,
): string => {
  // 1. Check if name or uri already has a valid extension
  if (mat) {
    const existing = getMaterialExtension(mat);
    if (existing && existing !== ".zip") return existing;
  }

  // 2. Magic Bytes Inspection
  if (data.length >= 4) {
    // PDF: %PDF (0x25 0x50 0x44 0x46)
    if (
      data[0] === 0x25 &&
      data[1] === 0x50 &&
      data[2] === 0x44 &&
      data[3] === 0x46
    ) {
      return ".pdf";
    }

    // JPEG: 0xFF 0xD8 0xFF
    if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
      return ".jpg";
    }

    // PNG: 0x89 0x50 0x4E 0x47 (\x89PNG)
    if (
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47
    ) {
      return ".png";
    }

    // MP3: ID3
    if (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
      return ".mp3";
    }

    // MP4 / M4A: 'ftyp' at bytes 4..7 (0x66 0x74 0x79 0x70)
    if (
      data.length >= 8 &&
      data[4] === 0x66 &&
      data[5] === 0x74 &&
      data[6] === 0x79 &&
      data[7] === 0x70
    ) {
      const brand = new TextDecoder("ascii", { fatal: false })
        .decode(data.subarray(8, 12))
        .toLowerCase();
      if (brand.includes("m4a") || brand.includes("mp4a")) {
        return ".m4a";
      }
      return ".mp4";
    }

    // RIFF (WAV, WEBP, AVI)
    if (
      data.length >= 12 &&
      data[0] === 0x52 &&
      data[1] === 0x49 &&
      data[2] === 0x46 &&
      data[3] === 0x46
    ) {
      const riffType = new TextDecoder("ascii", { fatal: false })
        .decode(data.subarray(8, 12))
        .toLowerCase();
      if (riffType.includes("wave")) return ".wav";
      if (riffType.includes("webp")) return ".webp";
      if (riffType.includes("avi ")) return ".avi";
    }

    // ZIP / OpenXML Office / EPUB: PK\x03\x04 (0x50 0x4B 0x03 0x04)
    if (
      data[0] === 0x50 &&
      data[1] === 0x4b &&
      data[2] === 0x03 &&
      data[3] === 0x04
    ) {
      // Inspect first 64KB for OpenXML content directories
      const headerSnippet = new TextDecoder("utf-8", { fatal: false }).decode(
        data.subarray(0, Math.min(data.length, 65536)),
      );
      if (
        headerSnippet.includes("ppt/") ||
        headerSnippet.includes("presentation") ||
        mat?.name?.toLowerCase().includes(".ppt") ||
        mat?.name?.toLowerCase().includes("ppt") ||
        mat?.type?.toLowerCase().includes("ppt") ||
        mat?.type?.toLowerCase().includes("presentation")
      ) {
        return ".pptx";
      }
      if (
        headerSnippet.includes("word/") ||
        mat?.name?.toLowerCase().includes(".doc") ||
        mat?.type?.toLowerCase().includes("word") ||
        mat?.type?.toLowerCase().includes("document")
      ) {
        return ".docx";
      }
      if (
        headerSnippet.includes("xl/") ||
        mat?.name?.toLowerCase().includes(".xls") ||
        mat?.type?.toLowerCase().includes("sheet") ||
        mat?.type?.toLowerCase().includes("excel")
      ) {
        return ".xlsx";
      }
      if (
        headerSnippet.includes("epub") ||
        headerSnippet.includes("META-INF")
      ) {
        return ".epub";
      }
      return ".zip";
    }
  }

  // 3. MIME Type Matching
  if (mimeType) {
    const ext = mimeToExtension(mimeType);
    if (ext) return ext;
  }

  // 4. Fallback to material type metadata if present
  if (mat?.type) {
    const ext = normalizeTypeToExtension(mat.type);
    if (ext) return ext;
  }

  return "";
};

export const resolveMaterialFileName = (
  mat: Material,
  fileResult?: { data: Uint8Array; mimeType: string },
): string => {
  const safeName = sanitizeFileName(mat.name);

  // 1. If safeName already ends with a known valid file extension, never append anything!
  const KNOWN_EXTS = [
    ".pptx",
    ".ppt",
    ".pdf",
    ".docx",
    ".doc",
    ".xlsx",
    ".xls",
    ".mp3",
    ".wav",
    ".m4a",
    ".aac",
    ".ogg",
    ".flac",
    ".mp4",
    ".webm",
    ".mov",
    ".avi",
    ".mkv",
    ".txt",
    ".rtf",
    ".epub",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
    ".zip",
    ".rar",
    ".7z",
  ];
  if (KNOWN_EXTS.some((ext) => safeName.toLowerCase().endsWith(ext))) {
    return safeName;
  }

  // 2. Check if material has a known extension from uri or name or type
  const existingExt = getMaterialExtension(mat);
  if (existingExt && existingExt !== ".zip") {
    if (safeName.toLowerCase().endsWith(existingExt.toLowerCase())) {
      return safeName;
    }
    return sanitizeFileName(`${safeName}${existingExt}`);
  }

  // 3. Fallback to guessing from bytes and mime type
  if (fileResult) {
    const guessedExt = guessExtensionFromBytesAndMime(
      fileResult.data,
      fileResult.mimeType,
      mat,
    );
    if (guessedExt && guessedExt !== ".zip") {
      if (safeName.toLowerCase().endsWith(guessedExt.toLowerCase())) {
        return safeName;
      }
      return sanitizeFileName(`${safeName}${guessedExt}`);
    }
  }

  if (mat.type) {
    const cleanExt = normalizeTypeToExtension(mat.type);
    if (cleanExt && !safeName.toLowerCase().endsWith(cleanExt.toLowerCase())) {
      return sanitizeFileName(`${safeName}${cleanExt}`);
    }
  }

  return safeName;
};

export const isGoogleDriveVirusWarning = (
  textOrBytes: string | Uint8Array,
): boolean => {
  const text =
    typeof textOrBytes === "string"
      ? textOrBytes
      : new TextDecoder("utf-8", { fatal: false }).decode(
          textOrBytes.subarray(0, Math.min(textOrBytes.length, 4096)),
        );
  return (
    text.includes("Google Drive - Virus scan warning") ||
    text.includes("can't scan this file for viruses") ||
    text.includes("is too large for Google to scan for viruses") ||
    (text.includes("uc-download-link") && text.includes("download-form"))
  );
};

export const extractGoogleDriveConfirmUrl = (html: string): string | null => {
  try {
    const formMatch =
      html.match(
        /<form[^>]*id=["']download-form["'][^>]*action=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<form[^>]*action=["']([^"']+)["'][^>]*id=["']download-form["']/i,
      );
    const actionUrl = formMatch?.[1];
    if (!actionUrl) return null;

    const inputRegex =
      /<input[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["']/gi;
    const params = new URLSearchParams();
    let match = inputRegex.exec(html);

    while (match !== null) {
      if (match[1]) {
        params.set(match[1], match[2] || "");
      }
      match = inputRegex.exec(html);
    }

    if (!params.has("confirm")) {
      params.set("confirm", "t");
    }

    const separator = actionUrl.includes("?") ? "&" : "?";
    return `${actionUrl}${separator}${params.toString()}`;
  } catch (err) {
    console.warn("Failed to extract Google Drive confirm URL:", err);
    return null;
  }
};

export const getMaterialIcon = (mat: Material) => {
  const isLink = isMaterialLink(mat.uri);
  const lowerName = mat.name.toLowerCase();

  if (isLink) {
    return <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />;
  }
  if (lowerName.includes("teacher")) {
    return <GraduationCap className="w-3 h-3 text-success shrink-0" />;
  }
  if (lowerName.includes("student") || lowerName.includes("handout")) {
    return <BookOpen className="w-3 h-3 text-primary shrink-0" />;
  }
  if (lowerName.includes("ppt")) {
    return <Presentation className="w-3 h-3 text-primary shrink-0" />;
  }
  return <FileText className="w-3 h-3 text-muted-foreground shrink-0" />;
};
