"use client";

import {
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  FileText,
  Headphones,
  ImageIcon,
  Loader2,
  Music,
  Play,
  Presentation,
  Video,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SiYoutube } from "react-icons/si";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useMaterialPreview } from "@/hooks/use-material-preview";
import { useVideo } from "@/hooks/use-video";
import { audioEngine } from "@/lib/audio-engine";
import { getAssetUrl } from "@/lib/storage";
import { cn, formatBytes, parseSize } from "@/lib/utils";
import type { Material } from "@/types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export type MaterialFormat =
  | "video"
  | "presentation"
  | "pdf"
  | "document"
  | "audio"
  | "spreadsheet"
  | "image"
  | "other";

export function getMaterialIframeUrl(mat: Material): string {
  const uri = mat.uri?.trim() || "";
  if (!uri) return "";

  if (/^https?:\/\//i.test(uri)) {
    const ytMatch = uri.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    );
    if (ytMatch?.[1]) {
      return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&modestbranding=1&rel=0`;
    }

    const driveMatch = uri.match(/(?:\/d\/|id=)([\w-]{10,})/);
    if (driveMatch?.[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }

    // Direct office doc/ppt preview via Google Docs viewer
    if (/\.(pptx?|docx?|xlsx?)$/i.test(uri)) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(uri)}&embedded=true`;
    }

    return uri;
  }

  if (/^[\w-]{10,}$/.test(uri)) {
    return `https://drive.google.com/file/d/${uri}/preview`;
  }

  return getAssetUrl(uri);
}

export function getMaterialDirectUrl(mat: Material): string {
  const uri = mat.uri?.trim() || "";
  if (!uri) return "";

  if (/^https?:\/\//i.test(uri)) {
    return uri;
  }

  if (/^[\w-]{10,}$/.test(uri)) {
    return `https://drive.google.com/file/d/${uri}/view`;
  }

  return getAssetUrl(uri);
}

export function detectMaterialFormat(
  name = "",
  type: string | null = null,
  uri = "",
): MaterialFormat {
  const lowerName = name.toLowerCase();
  const lowerType = (type || "").toLowerCase();
  const lowerUri = uri.toLowerCase();

  if (
    lowerUri.includes("youtube.com") ||
    lowerUri.includes("youtu.be") ||
    lowerName.endsWith(".mp4") ||
    lowerName.endsWith(".webm") ||
    lowerType.includes("video")
  ) {
    return "video";
  }

  if (
    lowerName.endsWith(".pptx") ||
    lowerName.endsWith(".ppt") ||
    lowerType.includes("presentation") ||
    lowerType.includes("powerpoint")
  ) {
    return "presentation";
  }

  if (
    lowerName.endsWith(".pdf") ||
    lowerType === "pdf" ||
    lowerType.includes("pdf")
  ) {
    return "pdf";
  }

  if (
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".rtf") ||
    lowerType.includes("word") ||
    lowerType.includes("document")
  ) {
    return "document";
  }

  if (
    lowerName.endsWith(".mp3") ||
    lowerName.endsWith(".m4a") ||
    lowerName.endsWith(".wav") ||
    lowerName.endsWith(".aac") ||
    lowerType.includes("audio")
  ) {
    return "audio";
  }

  if (
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".csv") ||
    lowerType.includes("sheet") ||
    lowerType.includes("excel")
  ) {
    return "spreadsheet";
  }

  if (
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".webp") ||
    lowerType.includes("image")
  ) {
    return "image";
  }

  return "other";
}

function getFormatMeta(format: MaterialFormat) {
  switch (format) {
    case "video":
      return {
        label: "Video",
        icon: <SiYoutube className="w-4 h-4 text-red-500" />,
        badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        loadingMsg: "Loading video player...",
        tip: "Watch online or open in YouTube for playback options.",
      };
    case "presentation":
      return {
        label: "Presentation (PPT)",
        icon: <Presentation className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
        loadingMsg: "Loading presentation slides...",
        tip: "Use arrow keys or click inside to advance slides.",
      };
    case "pdf":
      return {
        label: "PDF Document",
        icon: <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
        badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
        loadingMsg: "Loading PDF document...",
        tip: "Scroll to read or click Open for full screen reading.",
      };
    case "document":
      return {
        label: "Word Document",
        icon: <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
        badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
        loadingMsg: "Loading document preview...",
        tip: "Document preview loaded from cloud storage.",
      };
    case "audio":
      return {
        label: "Audio Recording",
        icon: <Headphones className="w-4 h-4 text-primary" />,
        badgeClass: "bg-primary/10 text-primary border-primary/25",
        loadingMsg: "Preparing audio player...",
        tip: "Click play to listen to this discourse recording.",
      };
    case "spreadsheet":
      return {
        label: "Spreadsheet",
        icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
        loadingMsg: "Loading spreadsheet...",
        tip: "Spreadsheet preview loaded from cloud storage.",
      };
    case "image":
      return {
        label: "Image",
        icon: <ImageIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
        badgeClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
        loadingMsg: "Loading image...",
        tip: "Click Open or Download for original resolution.",
      };
    default:
      return {
        label: "Study Material",
        icon: <FileText className="w-4 h-4 text-primary" />,
        badgeClass: "bg-muted text-muted-foreground border-border",
        loadingMsg: "Loading material preview...",
        tip: "File preview loaded from storage.",
      };
  }
}

export const MediaPreviewModal = () => {
  const { ytId, title: videoTitle, setYt } = useVideo();
  const { material, closePreview } = useMaterialPreview();
  const isMobile = useIsMobile();
  const [iframeLoading, setIframeLoading] = useState(true);

  const isOpen = !!ytId || !!material;

  const format: MaterialFormat = ytId
    ? "video"
    : material
      ? detectMaterialFormat(material.name, material.type, material.uri)
      : "other";

  const isVideo = !!ytId || format === "video";
  const rawTitle = ytId ? videoTitle : material?.name || "";
  const title = rawTitle.replace(/\.(pptx?|pdf|docx?|mp3|xlsx?)$/i, "");

  const meta = getFormatMeta(format);

  const iframeSrc = isVideo
    ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&modestbranding=1&rel=0`
    : material
      ? getMaterialIframeUrl(material)
      : "";

  const directUrl = isVideo
    ? `https://www.youtube.com/watch?v=${ytId}`
    : material
      ? getMaterialDirectUrl(material)
      : "";

  const downloadUrl = !isVideo && material ? getMaterialDirectUrl(material) : "";
  const formattedSize = material?.size ? formatBytes(parseSize(material.size)) : null;

  const handleClose = () => {
    if (ytId) setYt("", "");
    if (material) closePreview();
  };

  useEffect(() => {
    if (isOpen) {
      setIframeLoading(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!material || !downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = material.name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="p-0 overflow-hidden border-2 border-primary/35 bg-card shadow-[0_25px_70px_-15px_rgba(234,88,12,0.35),0_0_0_1px_rgba(249,115,22,0.25)] ring-4 ring-primary/15 rounded-2xl sm:rounded-3xl flex flex-col gap-0 transition-all duration-300"
        showCloseButton={false}
        style={{
          maxWidth: isMobile
            ? "calc(100vw - 1rem)"
            : isVideo
              ? "52rem"
              : "64rem",
          width: "100%",
        }}
      >
        {/* Sacred Golden-Saffron Radiant Accent Line */}
        <div className="h-1 sm:h-1.5 w-full bg-linear-to-r from-amber-400 via-orange-500 to-amber-500 shrink-0" />

        {/* Modern Elegant Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border/70 bg-linear-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 backdrop-blur-md shrink-0">
          {/* Format Icon, Badge, and Title */}
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className={cn("p-2 sm:p-2.5 rounded-xl shrink-0 border shadow-xs flex items-center justify-center bg-background/80 backdrop-blur-xs", meta.badgeClass)}>
              {meta.icon}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs", meta.badgeClass)}>
                  {meta.label}
                </span>
                {formattedSize && (
                  <span className="text-[11px] text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded-full">
                    {formattedSize}
                  </span>
                )}
              </div>
              <DialogTitle
                className="font-heading font-bold text-sm sm:text-base text-foreground truncate mt-1 tracking-tight"
                title={title}
              >
                {title}
              </DialogTitle>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {directUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-8.5 px-3.5 gap-1.5 text-xs font-semibold rounded-full shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0",
                  isVideo
                    ? "border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/25"
                    : "border-border/80 hover:bg-muted"
                )}
                title={isVideo ? "Watch on YouTube" : "Open in new tab"}
                onClick={() => window.open(directUrl, "_blank", "noopener,noreferrer")}
              >
                {isVideo ? (
                  <>
                    <SiYoutube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="hidden sm:inline">YouTube</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="hidden sm:inline">Open</span>
                  </>
                )}
              </Button>
            )}

            {downloadUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8.5 px-3.5 gap-1.5 text-xs font-semibold rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
                title="Download file directly"
                onClick={handleDownload}
              >
                <FileDown className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-8.5 w-8.5 rounded-full bg-muted/70 hover:bg-destructive/15 text-muted-foreground hover:text-destructive border border-border/60 transition-all cursor-pointer shrink-0 ml-1 shadow-2xs"
              title="Close preview (Esc)"
              onClick={handleClose}
              aria-label="Close dialog"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Media Content Body */}
        {format === "audio" ? (
          /* Dedicated Audio Player View */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-card via-muted/30 to-muted/60 min-h-[22rem]">
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-lg animate-pulse">
                <Music className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
              </div>
            </div>

            <div className="flex flex-col items-center text-center max-w-md gap-1">
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground">
                Spiritual Audio Recording • {formattedSize || "Audio Track"}
              </p>
            </div>

            <div className="w-full max-w-md flex flex-col gap-3">
              <audio
                controls
                src={directUrl}
                className="w-full h-11 rounded-xl shadow-xs"
                autoPlay
              />
              <div className="flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleDownload}
                  className="rounded-lg text-xs font-semibold gap-1.5 h-8 px-4"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download MP3</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(directUrl, "_blank")}
                  className="rounded-lg text-xs font-medium gap-1.5 h-8 px-4"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Iframe or Embedded Video / Document View */
          <div
            className={cn(
              "relative w-full flex items-center justify-center overflow-hidden",
              isVideo ? "aspect-video bg-black" : "bg-black/95",
            )}
            style={{
              aspectRatio: isVideo ? "16/9" : undefined,
              height: isVideo
                ? undefined
                : isMobile
                  ? format === "presentation"
                    ? "min(52vh, 400px)"
                    : "min(70vh, 560px)"
                  : "75vh",
              minHeight: isVideo ? undefined : isMobile ? "260px" : "400px",
            }}
          >
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/90 backdrop-blur-sm z-20">
                <Loader2 className="w-9 h-9 text-primary animate-spin" />
                <span className="text-xs font-semibold text-foreground">
                  {meta.loadingMsg}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Connecting to secure preview stream...
                </span>
              </div>
            )}

            <iframe
              src={iframeSrc}
              title={title}
              className="absolute inset-0 w-full h-full z-10 bg-transparent"
              style={{ border: 0, background: "transparent" }}
              onLoad={() => setIframeLoading(false)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}

        {/* Informative Footer for Documents & Slides */}
        {!isVideo && format !== "audio" && (
          <div className="px-4 py-2 bg-muted/60 border-t border-border/60 flex items-center justify-between text-xxs text-muted-foreground">
            <span className="truncate">{meta.tip}</span>
            <button
              type="button"
              onClick={() => window.open(directUrl, "_blank", "noopener,noreferrer")}
              className="text-primary hover:underline font-semibold shrink-0 ml-2 cursor-pointer"
            >
              Having trouble viewing? Open directly →
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
