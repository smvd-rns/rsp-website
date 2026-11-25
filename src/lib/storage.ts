import { ASSET_BASE_URL } from "@/constants";
import type { Category } from "@/types";
import categoryImageMapRaw from "@/lib/category-image-map.json";

const categoryImageMap = categoryImageMapRaw as Record<string, string>;

export const DEFAULT_FALLBACK_IMAGE_ID = "1uSfBfVRfVqNdhDJteMuOSYbVdYWEAUUZ";
export const DEFAULT_FALLBACK_IMAGE_URL = `https://lh3.googleusercontent.com/d/${DEFAULT_FALLBACK_IMAGE_ID}=s1600`;

export const getCategoryImageUrl = (
  cat: Category | undefined,
  _format?: "avif" | "webp",
): string => {
  if (!cat) return DEFAULT_FALLBACK_IMAGE_URL;

  // Helper to extract Google Drive file ID if a URL is provided
  const extractDriveId = (val: string): string | null => {
    const fileMatch = val.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch?.[1]) return fileMatch[1];
    const lh3Match = val.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match?.[1]) return lh3Match[1];
    const idParam = val.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParam?.[1]) return idParam[1];
    return null;
  };

  // 1. If category has an explicit image_url
  if (cat.image_url) {
    const u = String(cat.image_url).trim();
    if (u.startsWith("http")) {
      const driveId = extractDriveId(u);
      if (driveId) {
        return `https://lh3.googleusercontent.com/d/${driveId}=s1600`;
      }
      return u;
    }
    // If it's a relative path like /category-images/77.webp
    if (u.startsWith("/category-images/")) {
      const fname = u.replace("/category-images/", "").replace(/\.[^.]+$/, "");
      const driveId = categoryImageMap[fname];
      if (driveId) {
        return `https://lh3.googleusercontent.com/d/${driveId}=s1600`;
      }
    }
    // If it's a Google Drive file ID directly (alphanumeric string >= 25 chars)
    if (u.length >= 25 && /^[a-zA-Z0-9_-]+$/.test(u)) {
      return `https://lh3.googleusercontent.com/d/${u}=s1600`;
    }
    // Check map for filename or slug
    const mapped = categoryImageMap[u];
    if (mapped) {
      return `https://lh3.googleusercontent.com/d/${mapped}=s1600`;
    }
  }

  // 2. If category has legacy img field or img_id (e.g. 259)
  const imgVal = cat.img ?? (cat as any).img_id;
  if (imgVal !== undefined && imgVal !== null && imgVal !== "") {
    const str = String(imgVal).trim();
    // If already a Google Drive file ID directly
    if (str.length >= 25 && /^[a-zA-Z0-9_-]+$/.test(str)) {
      return `https://lh3.googleusercontent.com/d/${str}=s1600`;
    }

    // Direct match in Google Drive map
    if (categoryImageMap[str]) {
      return `https://lh3.googleusercontent.com/d/${categoryImageMap[str]}=s1600`;
    }

    // Convert numeric ID to base-36 (e.g. 259 -> 77, 1 -> 1, 10 -> a)
    const num = Number(imgVal);
    if (!isNaN(num) && num > 0) {
      const base36 = num.toString(36);
      if (categoryImageMap[base36]) {
        return `https://lh3.googleusercontent.com/d/${categoryImageMap[base36]}=s1600`;
      }
    }
  }

  return DEFAULT_FALLBACK_IMAGE_URL;
};

export const getAssetUrl = (id: string): string =>
  id.startsWith("http") ? id : `${ASSET_BASE_URL}${id}`;

export const getAssetProxyUrl = (id: string) => `/api/audio/${id}`;
