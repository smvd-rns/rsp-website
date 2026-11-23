import type { User } from "@supabase/supabase-js";
import { type ClassValue, clsx } from "clsx";
import type { MouseEvent as ReactMouseEvent } from "react";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const categoryPath = (urlPath?: string | null) =>
  urlPath ? `/${urlPath.replaceAll(".", "/")}` : "/";

export const slugToLabel = (slug: string) =>
  safeDecodeUri(slug)
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

export const getUserDisplayName = (user?: User, fallback = "User") =>
  (user?.user_metadata["full_name"] as string | undefined) ??
  user?.email?.split("@")[0] ??
  fallback;

export const createLimiter = (concurrency: number) => {
  let active = 0;
  const queue: (() => void)[] = [];
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        active++;
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            queue.shift()?.();
          });
      };
      active < concurrency ? run() : queue.push(run);
    });
  };
};

export const normalizeForNaturalSort = (str?: string | null): string => {
  if (!str) return "";
  return str
    .replace(/\s*[-_–—:]+\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const naturalSortByName =
  <T extends { name?: string | null }>(direction: 1 | -1 = 1) =>
  (a: T, b: T) => {
    const normA = normalizeForNaturalSort(a.name);
    const normB = normalizeForNaturalSort(b.name);
    const cmp = normA.localeCompare(normB, undefined, {
      numeric: true,
      sensitivity: "base",
    });
    if (cmp !== 0) return direction * cmp;
    return direction * (a.name || "").localeCompare(b.name || "");
  };

export const sortByOrderInd =
  (direction: 1 | -1 = 1) =>
  (a: { order_ind?: number | null }, b: { order_ind?: number | null }) =>
    direction * ((a.order_ind ?? 0) - (b.order_ind ?? 0));

export const sortByDate =
  <T extends {}, K extends keyof T>(
    order: 1 | -1 = 1,
    fieldName: K = "updated_at" as K,
  ): ((a: T, b: T) => number) =>
  (a, b) => {
    const timeA = a[fieldName] ? new Date(a[fieldName] as string).getTime() : 0;
    const timeB = b[fieldName] ? new Date(b[fieldName] as string).getTime() : 0;
    return order * (timeA - timeB);
  };

const STATIC_FILE_EXTENSIONS =
  /\.(png|jpg|jpeg|webp|avif|gif|svg|ico|txt|xml|json|map|css|js|webmanifest|woff|woff2|ttf|eot)$/i;

const EXPLOIT_PATTERNS =
  /(?:^|\.)(?:https?|ftp)|(?:https?|ftp)[-:]|(?:\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3})|^(?:www[-.]|\d{1,3}\.)/i;

export const hasStaticFileExtension = (path: string | string[]): boolean => {
  const segments = Array.isArray(path) ? path : path.split("/").filter(Boolean);
  return segments.some((segment) => STATIC_FILE_EXTENSIONS.test(segment));
};

export const isValidCategoryPath = (value: string) =>
  /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(value) &&
  !/^[-_.](next|well-known)/.test(value) &&
  !STATIC_FILE_EXTENSIONS.test(value) &&
  !EXPLOIT_PATTERNS.test(value);

const safeDecodeUri = (str: string): string => {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

export const toLtreeSlug = (name: string): string =>
  safeDecodeUri(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-");

/**
 * Converts a pathname (string or array of slug segments) to a DB urlPath (dot-separated, ltree format).
 * Automatically strips the leading "library" segment if present.
 * E.g., "/library/spiritual-discourses/bg" -> "spiritual-discourses.bg"
 * E.g., ["library", "spiritual-discourses", "bg"] -> "spiritual-discourses.bg"
 */
export const pathToUrlPath = (path: string | string[]): string => {
  let segments = Array.isArray(path)
    ? [...path]
    : path.split("/").filter(Boolean);

  if (segments[0] === "library" || segments[0] === "content") {
    segments = segments.slice(1);
  }

  return segments.map(toLtreeSlug).filter(Boolean).join(".");
};

export const toRoleId = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) ? value : undefined;

export interface ConsultationDetails {
  organization: string;
  engagementType: string;
  name: string;
  email: string;
  phone: string;
  audienceSize?: string;
  preferredDates?: string;
  message: string;
}

export const formatConsultationMessage = (
  details: ConsultationDetails,
): string =>
  [
    "--- Consultation / Speaker Invitation Details ---",
    `Organization / Institution: ${details.organization.trim()}`,
    `Engagement Type: ${details.engagementType}`,
    `Contact Person: ${details.name.trim()}`,
    `Official Email: ${details.email.trim()}`,
    `Phone / WhatsApp: ${details.phone.trim()}`,
    details.audienceSize?.trim()
      ? `Estimated Audience Size: ${details.audienceSize.trim()}`
      : null,
    details.preferredDates?.trim()
      ? `Preferred Dates / Timeframe: ${details.preferredDates.trim()}`
      : null,
    "",
    "--- Proposed Theme / Message Details ---",
    details.message.trim(),
  ]
    .filter(Boolean)
    .join("\n");

export const parseSize = (size?: unknown): number => {
  if (size == null) return 0;
  if (typeof size === "number") {
    return Number.isFinite(size) ? Math.max(0, size) : 0;
  }
  if (typeof size === "string") {
    const trimmed = size.trim();
    if (!trimmed) return 0;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
};

export const formatSize = (bytes?: unknown): string => {
  const num = parseSize(bytes);
  if (num <= 0) return "";
  const k = 1024;
  if (num < k) return `${num}B`;
  if (num < k * k) {
    const kb = num / k;
    return `${Math.round(kb)}kB`;
  }
  if (num < k * k * k) {
    const mb = num / (k * k);
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace(/\.0$/, "")}MB`;
  }
  const gb = num / (k * k * k);
  return `${gb.toFixed(1).replace(/\.0$/, "")}GB`;
};

export const navigateClientSide = (href: string, e?: ReactMouseEvent) => {
  e?.preventDefault();
  window.history.pushState(null, "", href);
  window.scrollTo({ top: 0, behavior: "instant" });
};

export const parseDate = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isSameDay = (d1: Date, d2: Date = new Date()): boolean =>
  d1.getDate() === d2.getDate() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getFullYear() === d2.getFullYear();

export const formatQueryDate = (dateStr?: string | null): string => {
  const date = parseDate(dateStr);
  if (!date) return "";

  const now = new Date();
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isSameDay(date, now)) {
    return `Today, ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return `Yesterday, ${timeStr}`;
  }

  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })}, ${timeStr}`;
};

export const formatCompactDate = (dateStr?: string | null): string => {
  const date = parseDate(dateStr);
  if (!date) return "";

  const now = new Date();
  if (isSameDay(date, now)) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error("Failed to copy to clipboard", err);
    return false;
  }
};

export const buildRecordingPermalink = ({
  categoryUrlPath,
  recId,
  matId,
}: {
  categoryUrlPath?: string | null;
  recId: number;
  matId?: number | null;
}): string => {
  if (typeof window === "undefined") return "";
  let path = categoryUrlPath
    ? categoryPath(categoryUrlPath)
    : window.location.pathname;

  // Clean out any legacy leading /library or /content prefix
  path = path.replace(/^\/(?:library|content)(?=\/|$)/, "");
  if (!path.startsWith("/")) path = `/${path}`;

  const params = new URLSearchParams({ q: String(recId) });
  if (matId != null) {
    params.set("m", String(matId));
  }
  return `${window.location.origin}${path}?${params.toString()}`;
};

export const extractYoutubeId = (input: string): string | null => {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    let urlString = trimmed;
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = `https://${urlString}`;
    }
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    if (hostname === "youtu.be") {
      const id = url.pathname.substring(1);
      const cleanId = id.split("/")[0].split("?")[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(cleanId)) return cleanId;
    }

    if (hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      const embedIdx = parts.findIndex(
        (p) => p === "embed" || p === "v" || p === "shorts",
      );
      if (embedIdx !== -1 && parts[embedIdx + 1]) {
        const clean = parts[embedIdx + 1].split("?")[0];
        if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
      }
    }
  } catch {}
  return null;
};

export const parseYoutubeUrlOrToast = (
  youtubeUrl: string,
  showToast: (msg: string) => void,
): { valid: boolean; ytId: string | null } => {
  if (!youtubeUrl.trim()) return { valid: true, ytId: null };
  const extracted = extractYoutubeId(youtubeUrl);
  if (!extracted) {
    showToast("Please enter a valid YouTube video link or 11-character ID.");
    return { valid: false, ytId: null };
  }
  return { valid: true, ytId: extracted };
};

export const triggerSync = (tables?: string[]) => {
  if (typeof window !== "undefined") {
    if (tables && Array.isArray(tables) && tables.length > 0) {
      window.dispatchEvent(
        new CustomEvent("trigger-sync", { detail: { tables } }),
      );
    } else {
      window.dispatchEvent(new Event("trigger-sync"));
    }
  }
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

export const cleanFilenameToTitle = (filename: string): string => {
  // 1. Remove file extension
  let name = filename.replace(/\.[^/.]+$/, "");

  // 2. Normalize compound separators like _-_ or -_- or _- to a clean " - "
  name = name.replace(/[\s_]+-[\s_]+/g, " - ");

  // 3. Replace remaining underscores with spaces
  name = name.replace(/_/g, " ");

  // 4. Ensure space after commas if missing (e.g. "Lila,21" -> "Lila, 21")
  name = name.replace(/,([^\s])/g, ", $1");

  // 5. Separate camelCase if present (e.g. "LordKrishna" -> "Lord Krishna")
  name = name.replace(/([a-z])([A-Z])/g, "$1 $2");

  // 6. Collapse multiple whitespace
  name = name.replace(/\s+/g, " ").trim();

  return name;
};

export const normalizeQueryAttachments = (raw: unknown): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "null" || trimmed === "[]") return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const normalizeForwardHistory = (raw: unknown): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "null" || trimmed === "[]") return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const formatRelativeTime = (dateInput: string | Date): string => {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

export const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const getURL = () => {
  if (typeof window !== "undefined") {
    return window.location.origin.endsWith("/")
      ? window.location.origin
      : `${window.location.origin}/`;
  }
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ??
    process?.env?.NEXT_PUBLIC_VERCEL_URL ??
    "http://localhost:3002/";
  url = url.startsWith("http") ? url : `https://${url}`;
  url = url.endsWith("/") ? url : `${url}/`;
  return url;
};

export const buildCategoryUrlPath = (name: string, parentUrlPath?: string) => {
  if (!name) throw new Error("Please provide category name");
  const slug = toLtreeSlug(name);
  return parentUrlPath ? `${parentUrlPath}.${slug}` : slug;
};

export const getSavings = (original: number, compressed: number): string => {
  if (original <= 0) return "";
  const ratio = ((original - compressed) / original) * 100;
  return ratio > 0 ? `-${Math.round(ratio)}%` : `+${Math.round(-ratio)}%`;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const formatDateToRecordingPrefix = (
  dateStr?: string | null,
): string => {
  let d: Date;
  if (dateStr) {
    const parts = dateStr.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const year = Number.parseInt(parts[0], 10);
      const month = Number.parseInt(parts[1], 10) - 1;
      const day = Number.parseInt(parts[2], 10);
      d = new Date(year, month, day);
    } else {
      d = new Date(dateStr);
    }
  } else {
    d = new Date();
  }

  if (Number.isNaN(d.getTime())) {
    d = new Date();
  }

  const yyyy = d.getFullYear();
  const mmm = MONTH_NAMES[d.getMonth()] || "Jan";
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mmm}-${dd}`;
};

export const formatRecordingAudioFilename = ({
  recordedAt,
  venueName,
  languageName,
  eventOrTypeShortName,
  title,
  speakerName,
  extension = "mp3",
}: {
  recordedAt?: string | null;
  venueName?: string | null;
  languageName?: string | null;
  eventOrTypeShortName?: string | null;
  title: string;
  speakerName?: string | null;
  extension?: string;
}): string => {
  // 1. Date: 2019-Oct-20
  const datePart = formatDateToRecordingPrefix(recordedAt);

  // 2. Place / Venue
  const placePart = (venueName || "Unknown")
    .trim()
    .replace(/[/\\?%*:|"<>_]/g, " ");

  // 3. Language
  const langPart = (languageName || "English")
    .trim()
    .replace(/[/\\?%*:|"<>_]/g, " ");

  // 4. Event / Format short form (e.g. Lec, Sem, or Event shortname)
  let shortForm = (eventOrTypeShortName || "Lec")
    .trim()
    .replace(/[/\\?%*:|"<>_]/g, " ");
  if (shortForm.toLowerCase() === "lecture") shortForm = "Lec";
  else if (shortForm.toLowerCase() === "seminar") shortForm = "Sem";

  // 5. Title
  const titlePart = title.trim().replace(/[/\\?%*:|"<>_]/g, " ");

  // 6. Speaker name (strip HG/HH prefix if present)
  let cleanSpeaker = (speakerName || "Radheshyam Das")
    .trim()
    .replace(/[/\\?%*:|"<>_]/g, " ");
  cleanSpeaker = cleanSpeaker.replace(/^(HG|HH)\s+/i, "");

  const ext = extension.replace(/^\./, "") || "mp3";

  return `${datePart}_${placePart}_${langPart}_${shortForm}_${titlePart}_${cleanSpeaker}.${ext}`;
};
