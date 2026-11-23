import { ASSET_BASE_URL } from "@/constants";
import type { Category } from "@/types";

export const getCategoryImageUrl = (
  cat: Category | undefined,
  _format?: "avif" | "webp",
): string | undefined => {
  if (!cat) return undefined;

  // Helper to extract Google Drive file ID if a URL is provided
  const extractDriveId = (val: string): string | null => {
    const fileMatch = val.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch?.[1]) return fileMatch[1];
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
    if (u.startsWith("/category-images/")) return u;
    if (u === "/rsp.webp") return "/rsp.webp";
    // Otherwise treat as a Google Drive file ID
    return `https://lh3.googleusercontent.com/d/${u}=s1600`;
  }

  // 2. If category has legacy img field
  if (cat.img) {
    const str = String(cat.img).trim();
    if (!/^\d+$/.test(str)) {
      return `https://lh3.googleusercontent.com/d/${str}=s1600`;
    }
    const base36 = Number(cat.img).toString(36);
    return `/category-images/${base36}.webp`;
  }

  return "/rsp.webp";
};

export const getAssetUrl = (id: string): string =>
  id.startsWith("http") ? id : `${ASSET_BASE_URL}${id}`;

export const getAssetProxyUrl = (id: string) => `/api/audio/${id}`;
