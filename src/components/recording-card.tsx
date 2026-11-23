"use client";

import {
  AlertTriangle,
  Archive,
  Check,
  ChevronDown,
  FileDown,
  FolderDown,
  Link2,
  Loader2,
  Music,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SiYoutube } from "react-icons/si";
import { toast } from "sonner";
import { STREAM_LIMIT_BYTES } from "@/constants";
import { useAudioPlayback } from "@/hooks/use-audio";
import { useBatchDownloader } from "@/hooks/use-batch-downloader";
import { useCategories } from "@/hooks/use-categories";
import { useVideo } from "@/hooks/use-video";
import { audioEngine } from "@/lib/audio-engine";
import { sanitizeFileName } from "@/lib/material-utils";
import { getAssetProxyUrl, getAssetUrl } from "@/lib/storage";
import {
  buildRecordingPermalink,
  cn,
  copyToClipboard,
  parseSize,
} from "@/lib/utils";
import type { EnrichedRecording } from "@/types";
import { RecordingMeta } from "./recording-meta";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface RecordingCardProps {
  rec: EnrichedRecording;
  q: string | null;
  m: string | null;
  onKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
  viewMode?: "grid" | "list";
}

const CACHE_NAME = "rsp-audio-cache";

const LargeFileWarning = ({ message }: { message: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex items-center text-warning shrink-0">
        <AlertTriangle className="w-3 h-3" />
      </span>
    </TooltipTrigger>
    <TooltipContent side="left" className="max-w-xs text-xs">
      {message}
    </TooltipContent>
  </Tooltip>
);

export const RecordingCard = ({
  rec,
  q,
  m,
  onKeyDown,
  viewMode = "grid",
}: RecordingCardProps) => {
  const { isPlaying, currentAudioId } = useAudioPlayback();
  const [isCached, setIsCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { data: categories } = useCategories();
  const [isCopied, setIsCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const { startZipDownload } = useBatchDownloader();
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const { setYt } = useVideo();

  // Async dynamic cache checking on initial mount without thread block
  useEffect(() => {
    const verifyCacheState = async () => {
      if (!rec.audio_id) return;
      const cache = await caches.open(CACHE_NAME);
      const matched = await cache.match(rec.audio_id);
      setIsCached(!!matched);
    };
    verifyCacheState();
  }, [rec.audio_id]);

  const isHighlighted = q != null && Number(q) === rec.id;
  const isActiveTrack =
    rec.audio_id !== undefined && currentAudioId === rec.audio_id;
  const isOverStreamLimit = parseSize(rec.size) > STREAM_LIMIT_BYTES;
  const hasLargeMaterials = Boolean(
    rec.materials?.some((mat) => parseSize(mat.size) > STREAM_LIMIT_BYTES),
  );
  const hasAnyLargeFiles = isOverStreamLimit || hasLargeMaterials;

  const handlePlayClick = async () => {
    if (!rec.audio_id || isLoading) return;

    if (isActiveTrack) {
      audioEngine.togglePlay();
    } else {
      setIsLoading(true);
      try {
        const url = getAssetProxyUrl(rec.audio_id);
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(rec.audio_id);

        if (cachedResponse) {
          // Play instantly from local offline cache
          const blob = await cachedResponse.blob();
          await audioEngine.playTrack(rec.audio_id, rec, blob);
        } else {
          // Play immediately via streaming URL (~150ms start)
          await audioEngine.playTrack(rec.audio_id, rec, url);

          // Download and populate CacheStorage in background without interrupting playback
          const response = await fetch(url);
          if (!response.ok) throw new Error("Stream connection drops");
          await cache.put(rec.audio_id, response.clone());
          setIsCached(true);
        }
      } catch (err) {
        console.error("Failed handling execution stream setup", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDownload = async () => {
    if (!rec.audio_id) return;
    const fileName = `${rec.name.replace(/[/\\?%*:|"<>\s]/g, "_")}.mp3`;
    toast.info(`Starting audio download: ${fileName}`, { duration: 3000 });

    let url = getAssetUrl(rec.audio_id);
    let objectUrl: string | null = null;

    try {
      const cache = await caches.open(CACHE_NAME);
      const matched = await cache.match(rec.audio_id);
      if (matched) {
        const blob = await matched.blob();
        objectUrl = URL.createObjectURL(blob);
        url = objectUrl;
      }
    } catch (err) {
      console.error("Failed to read audio from cache for download:", err);
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (objectUrl) {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
    }
  };

  const handleDownloadMaterials = async () => {
    if (!rec.materials || rec.materials.length === 0 || isBatchProcessing)
      return;
    setIsBatchProcessing(true);
    const toastId = `mat-dl-${rec.id}`;
    const totalCount = rec.materials.length;
    toast.loading(`Preparing ${totalCount} study materials...`, {
      id: toastId,
      description: "Connecting to cloud storage...",
    });
    try {
      const safeName = sanitizeFileName(rec.name);
      await startZipDownload({
        recordings: [rec],
        selectedAudioIds: new Set(),
        selectedMaterialIds: new Set(rec.materials.map((m) => m.id)),
        zipFileName: `${safeName}_materials.zip`,
        shouldCache: true,
        onProgress: (p) => {
          if (p.stage === "zipping") {
            toast.loading("Compressing files into ZIP archive...", {
              id: toastId,
              description: `Bundling ${totalCount} materials...`,
            });
          } else {
            toast.loading(
              `Downloading materials (${p.completed}/${p.total})...`,
              {
                id: toastId,
                description: p.currentName || "Fetching files...",
              },
            );
          }
        },
      });
      toast.success("Study materials downloaded successfully!", {
        id: toastId,
        description: `${totalCount} files packaged into ${safeName}_materials.zip`,
        duration: 4000,
      });
    } catch (err) {
      console.error("Failed downloading materials", err);
      toast.error("Failed to download materials", {
        id: toastId,
        description: "Please check your network and try again.",
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleDownloadAll = async () => {
    if (isBatchProcessing) return;
    setIsBatchProcessing(true);
    const toastId = `bundle-dl-${rec.id}`;
    const totalFiles = (rec.audio_id ? 1 : 0) + (rec.materials?.length || 0);
    toast.loading(`Preparing complete bundle (${totalFiles} items)...`, {
      id: toastId,
      description: "Fetching audio & reference documents...",
    });
    try {
      const safeName = sanitizeFileName(rec.name);
      await startZipDownload({
        recordings: [rec],
        selectedAudioIds: rec.audio_id ? new Set([rec.audio_id]) : new Set(),
        selectedMaterialIds: new Set((rec.materials ?? []).map((m) => m.id)),
        zipFileName: `${safeName}_bundle.zip`,
        shouldCache: true,
        onProgress: (p) => {
          if (p.stage === "zipping") {
            toast.loading("Compressing bundle into ZIP archive...", {
              id: toastId,
              description: `Packaging ${totalFiles} items...`,
            });
          } else {
            toast.loading(`Downloading items (${p.completed}/${p.total})...`, {
              id: toastId,
              description: p.currentName || "Fetching files...",
            });
          }
        },
      });
      toast.success("Complete bundle downloaded successfully!", {
        id: toastId,
        description: `Saved to ${safeName}_bundle.zip`,
        duration: 4000,
      });
    } catch (err) {
      console.error("Failed downloading bundle", err);
      toast.error("Failed to download bundle", {
        id: toastId,
        description: "Please check your network and try again.",
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleTouchStart = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsDropdownOpen(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      isLongPressRef.current = false;
      return;
    }
    handleDownload();
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const cat = categories?.find((c) => c?.id === rec.category_id);
    const url = buildRecordingPermalink({
      categoryUrlPath: cat?.url_path,
      recId: rec.id,
    });

    const success = await copyToClipboard(url);
    if (success) {
      setIsCopied(true);
      toast.success("Recording link copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      toast.error("Failed to copy link");
    }
  };

  const hasMaterials = Boolean(rec.materials && rec.materials.length > 0);

  if (viewMode === "grid") {
    const ytCover = rec.yt_id ? `/api/thumbnail/${rec.yt_id}` : null;
    const fallbackCover = "/rsp.webp";

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: recording card keyboard navigation
      <div
        // biome-ignore lint/a11y/noNoninteractiveTabindex: recording card keyboard navigation
        tabIndex={0}
        data-recording-item
        onKeyDown={onKeyDown}
        className={cn(
          "group flex flex-col h-full rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-card overflow-hidden shadow-xs hover:shadow-lg hover:border-primary/50 focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-300",
          isHighlighted && "border-primary bg-primary/5 ring-2 ring-primary",
        )}
      >
        {/* Top Video Thumbnail Box */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: video thumbnail click to play */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: handled by card onKeyDown */}
        <div
          className="relative aspect-video w-full overflow-hidden bg-muted group/cover cursor-pointer select-none"
          onClick={() => {
            if (rec.yt_id) {
              setYt(rec.yt_id, rec.name);
            } else {
              handlePlayClick();
            }
          }}
        >
          <img
            src={ytCover || fallbackCover}
            alt={rec.name}
            loading="lazy"
            onError={(e) => {
              if (rec.yt_id && !e.currentTarget.src.includes("ytimg")) {
                e.currentTarget.src = `https://i.ytimg.com/vi/${rec.yt_id}/mqdefault.jpg`;
              } else if (!e.currentTarget.src.endsWith("/rsp.webp")) {
                e.currentTarget.src = fallbackCover;
              }
            }}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/cover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Floating Center Play Overlay Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300",
                rec.yt_id
                  ? "bg-red-600/90 text-white hover:bg-red-600 hover:scale-110 ring-4 ring-black/25 backdrop-blur-xs"
                  : isActiveTrack && isPlaying
                    ? "bg-primary text-primary-foreground scale-110 ring-4 ring-primary/30"
                    : "bg-black/60 backdrop-blur-md text-white border border-white/20 group-hover/cover:scale-110 group-hover/cover:bg-primary group-hover/cover:border-transparent group-hover/cover:text-primary-foreground",
              )}
              title={
                rec.yt_id
                  ? "Watch Video"
                  : isActiveTrack && isPlaying
                    ? "Pause Audio"
                    : "Play Audio"
              }
            >
              {isLoading && !rec.yt_id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : !rec.yt_id && isActiveTrack && isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
              )}
            </div>
          </div>

          {/* Bottom Right Video Indicator (small & unobtrusive) */}
          {rec.yt_id && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white/90 border border-white/10 flex items-center gap-1 shadow-xs pointer-events-none">
              <SiYoutube className="w-3 h-3 text-red-500" />
              <span>Video</span>
            </div>
          )}
        </div>

        {/* Card Body with Title, Details and Materials */}
        <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
          <RecordingMeta rec={rec} m={m} />

          {/* Bottom Action Controls */}
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border/60">
            {/* Audio Play Button */}
            {rec.audio_id ? (
              <Button
                type="button"
                variant={isActiveTrack && isPlaying ? "default" : "secondary"}
                size="sm"
                onClick={handlePlayClick}
                disabled={isLoading}
                className={cn(
                  "font-semibold text-xs cursor-pointer gap-1.5 h-8 px-2.5 rounded-lg transition-all shadow-xs shrink-0",
                  isActiveTrack && isPlaying
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "hover:bg-primary/10 hover:text-primary",
                )}
                title={
                  isActiveTrack && isPlaying ? "Pause Audio" : "Play Audio"
                }
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isActiveTrack && isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Music className="w-3.5 h-3.5 text-primary" />
                )}
                <span>{isActiveTrack && isPlaying ? "Pause" : "Audio"}</span>
                {isCached && !isLoading && (
                  <Check className="w-3 h-3 text-success shrink-0" />
                )}
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              {hasMaterials ? (
                <DropdownMenu
                  open={isDropdownOpen}
                  onOpenChange={setIsDropdownOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBatchProcessing}
                      className={cn(
                        "h-8 px-2.5 text-xs font-medium rounded-lg gap-1.5 border-border/80 shrink-0",
                        isBatchProcessing
                          ? "bg-primary/10 text-primary border-primary/30 cursor-wait"
                          : "hover:bg-muted cursor-pointer",
                      )}
                      title={
                        isBatchProcessing
                          ? "Preparing download..."
                          : "Download options"
                      }
                    >
                      {isBatchProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span>
                        {isBatchProcessing ? "Preparing..." : "Download"}
                      </span>
                      {!isBatchProcessing && (
                        <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    side="top"
                    sideOffset={6}
                    className="w-60 p-1.5 rounded-xl shadow-2xl border border-stone-200/90 dark:border-stone-800 bg-card text-foreground z-50"
                  >
                    <DropdownMenuItem
                      onClick={handleDownload}
                      disabled={isBatchProcessing}
                      className="cursor-pointer gap-2.5 py-2 px-3 text-xs rounded-lg hover:bg-accent focus:bg-accent transition-colors"
                    >
                      <FileDown className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground">
                          Audio (.mp3)
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Direct audio file
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDownloadMaterials}
                      disabled={isBatchProcessing}
                      className="cursor-pointer gap-2.5 py-2 px-3 text-xs rounded-lg hover:bg-accent focus:bg-accent transition-colors"
                    >
                      <FolderDown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground">
                          Study Materials ({rec.materials?.length})
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          All slides & reference docs
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDownloadAll}
                      disabled={isBatchProcessing}
                      className="cursor-pointer gap-2.5 py-2 px-3 text-xs rounded-lg hover:bg-accent focus:bg-accent transition-colors"
                    >
                      <Archive className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground">
                          Complete Bundle (.zip)
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Audio + all study materials
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isBatchProcessing}
                  onClick={handleDownload}
                  className="font-medium text-xs cursor-pointer h-8 px-2.5 gap-1.5 rounded-lg border-border/80 hover:bg-muted shadow-xs shrink-0"
                  title="Download Audio (.mp3)"
                >
                  <FileDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Download</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className={cn(
                  "font-medium text-xs cursor-pointer h-8 w-8 p-0 rounded-lg border-border/80 shadow-xs transition-colors shrink-0 flex items-center justify-center",
                  isCopied && "border-success/50 bg-success/10 text-success",
                )}
                title={isCopied ? "Link copied!" : "Share recording link"}
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: handled for custom list focus/navigation
    <div
      // biome-ignore lint/a11y/noNoninteractiveTabindex: handled for custom list focus/navigation
      tabIndex={0}
      data-recording-item
      onKeyDown={onKeyDown}
      className={cn(
        "p-4 border rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-2 group focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200 ease-in-out",
        isHighlighted
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-card hover:shadow-md",
      )}
    >
      <RecordingMeta {...{ rec, m }} />

      {/* Media Links / Actions */}
      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end border-t md:border-none border-border pt-2 md:pt-0 shrink-0">
        {rec.audio_id && (
          <>
            {!isOverStreamLimit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePlayClick}
                disabled={isLoading}
                className="font-bold text-xs cursor-pointer"
                title={
                  isLoading
                    ? "Loading..."
                    : isActiveTrack && isPlaying
                      ? "Pause Audio"
                      : "Play Audio"
                }
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isActiveTrack && isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>
                  {isLoading
                    ? "Loading..."
                    : isActiveTrack && isPlaying
                      ? "Pause"
                      : "Play"}
                </span>
                {isCached && !isLoading && (
                  <Check className="w-3 h-3 text-success shrink-0" />
                )}
              </Button>
            )}

            {hasMaterials ? (
              <DropdownMenu
                open={isDropdownOpen}
                onOpenChange={setIsDropdownOpen}
              >
                <div className="inline-flex items-center rounded-lg border border-border bg-background overflow-hidden">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleButtonClick}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setIsDropdownOpen(true);
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    disabled={isBatchProcessing}
                    className="font-bold text-xs cursor-pointer"
                    title="Download Audio (Right-click or long-press for more options)"
                  >
                    {isBatchProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                    <span className="hidden md:flex">
                      {isBatchProcessing ? "Downloading..." : "Download"}
                    </span>
                  </Button>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isBatchProcessing}
                      className="px-1.5 cursor-pointer text-muted-foreground hover:text-primary"
                      style={{
                        borderLeft: "1px solid var(--border)",
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                      }}
                      title="More download options"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </div>
                <DropdownMenuContent
                  align="end"
                  side="bottom"
                  style={{ width: "16rem" }}
                >
                  <DropdownMenuItem
                    onClick={handleDownload}
                    className="cursor-pointer gap-2 text-xs font-medium justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-muted-foreground" />
                      <span>Audio Only (.mp3)</span>
                    </div>
                    {isOverStreamLimit && (
                      <LargeFileWarning message="Audio exceeds 100 MB, so it will not be included in ZIP downloads and will open in a separate tab." />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDownloadMaterials}
                    className="cursor-pointer gap-2 text-xs font-medium justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <FolderDown className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Materials Only ({rec.materials?.length}) (.zip)
                      </span>
                    </div>
                    {hasLargeMaterials && (
                      <LargeFileWarning message="Contains file(s) exceeding 100 MB, which will not be included in the ZIP archive and will open in a separate tab." />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDownloadAll}
                    className="cursor-pointer gap-2 text-xs font-medium justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4 text-muted-foreground" />
                      <span>Complete Bundle (Audio + Materials)</span>
                    </div>
                    {hasAnyLargeFiles && (
                      <LargeFileWarning message="Contains file(s) exceeding 100 MB, which will not be included in the ZIP archive and will open in a separate tab." />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="font-bold text-xs cursor-pointer"
                title="Download Audio"
              >
                <FileDown className="w-4 h-4" />
                <span className="hidden md:flex">Download</span>
              </Button>
            )}
          </>
        )}

        {rec.yt_id && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="font-bold text-xs cursor-pointer bg-destructive text-white border-transparent"
            title="Watch on YouTube"
            onClick={() => setYt(rec.yt_id ?? "", rec.name)}
          >
            <SiYoutube className="w-4 h-4" />
            <span className="hidden md:flex">YouTube</span>
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="font-bold text-xs cursor-pointer"
          title={isCopied ? "Link copied!" : "Copy link to recording"}
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          <span className="hidden md:flex">
            {isCopied ? "Copied" : "Share"}
          </span>
        </Button>
      </div>
    </div>
  );
};
