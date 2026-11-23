import { ASSET_BASE_URL } from "@/constants";
import type { Category } from "@/types";

export const getCategoryImageUrl = (
  cat: Category | undefined,
  _format?: "avif" | "webp",
): string | undefined => {
  if (!cat) return undefined;
  if (cat.image_url) {
    const u = String(cat.image_url).trim();
    if (u.startsWith("http")) return u;
    return `https://lh3.googleusercontent.com/d/${u}=s1600`;
  }
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
