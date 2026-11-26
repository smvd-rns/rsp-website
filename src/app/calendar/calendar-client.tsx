"use client";

import {
  CalendarDays,
  Download,
  ExternalLink,
  Info,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRef, useState } from "react";
import type { CalendarViewerUrls } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface CalendarClientProps {
  config: CalendarViewerUrls & { updatedAt: string | null };
}

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.15;
const ZOOM_PRESETS = [0.8, 1, 1.25, 1.5, 2];

export const CalendarClient = ({ config }: CalendarClientProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(ZOOM_MAX, Number((prev + ZOOM_STEP).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(ZOOM_MIN, Number((prev - ZOOM_STEP).toFixed(2))));
  };

  const handleResetZoom = () => {
    setZoom(1);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    }
  };

  const handleSetPreset = (preset: number) => {
    setZoom(preset);
  };

  // Allow Ctrl + Mouse Wheel zoom inside viewer without zooming whole page
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setZoom((prev) =>
        Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number((prev + delta).toFixed(2)))),
      );
    }
  };

  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:gap-6 w-full transition-all duration-300",
        isFullscreen &&
          "fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-3 sm:p-6 overflow-y-auto",
      )}
    >
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-amber-500/20 via-orange-500/20 to-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-xs shrink-0">
            <CalendarDays className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-foreground flex items-center gap-2">
              Discourse Calendar & Schedule
            </h1>
            <p className="text-xs text-muted-foreground">
              Official schedule of lectures, upcoming youth camps, and seminar tours.
            </p>
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* In-Viewer Document Zoom Controls */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-border bg-card shadow-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= ZOOM_MIN}
              className="p-1.5 rounded-lg hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Zoom out document"
              aria-label="Zoom out document"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs font-mono font-bold text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
              title="Click to reset document zoom to 100%"
            >
              {zoomPercentage}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= ZOOM_MAX}
              className="p-1.5 rounded-lg hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Zoom in document"
              aria-label="Zoom in document"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {zoom !== 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                title="Reset zoom"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer shadow-xs active:scale-95"
            title="Reload calendar preview"
          >
            <RotateCw className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer shadow-xs active:scale-95"
            title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>

          <a
            href={config.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer shadow-xs active:scale-95"
            title="Download document file"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Download</span>
          </a>

          <a
            href={config.viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-linear-to-r from-amber-600 via-orange-600 to-amber-700 text-white hover:opacity-90 transition-all shadow-xs active:scale-95"
            title="Open in Google Drive"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in Drive</span>
          </a>
        </div>
      </div>

      {/* Preset Zoom Quick Pills (Mobile & Desktop) */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <span className="text-[11px] font-medium text-muted-foreground mr-1 shrink-0">
            Doc Zoom:
          </span>
          {ZOOM_PRESETS.map((preset) => {
            const pct = Math.round(preset * 100);
            const isActive = Math.abs(zoom - preset) < 0.05;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleSetPreset(preset)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-xs scale-105"
                    : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {pct}%
              </button>
            );
          })}
        </div>

        {zoom > 1 && (
          <span className="hidden sm:inline-block text-[11px] text-muted-foreground italic truncate">
            Tip: Scroll or drag to pan around document
          </span>
        )}
      </div>

      {/* Embed Viewer Card */}
      <div className="relative w-full rounded-2xl border border-amber-500/20 dark:border-amber-500/30 bg-card shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
        {/* Subtle decorative top saffron bar */}
        <div className="h-1 bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 shrink-0" />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/80 backdrop-blur-xs">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-medium text-muted-foreground">
              Loading calendar document preview...
            </p>
          </div>
        )}

        {/* Scrollable Container with Zoom scaling */}
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          className="relative w-full overflow-auto bg-card overscroll-contain"
          style={{
            height: isFullscreen ? "calc(100vh - 120px)" : "72vh",
            maxHeight: isFullscreen ? "calc(100vh - 120px)" : "82vh",
            WebkitOverflowScrolling: "touch",
            touchAction: zoom > 1 ? "pan-x pan-y" : "auto",
          }}
        >
          {/* Sizing wrapper that establishes the scroll dimensions */}
          <div
            style={{
              width: `${Math.max(100, zoom * 100)}%`,
              height: `${Math.max(100, zoom * 100)}%`,
              minWidth: "100%",
              minHeight: "100%",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Scaled wrapper */}
            <div
              style={{
                width: `${100 / zoom}%`,
                height: `${100 / zoom}%`,
                transform: `scale(${zoom})`,
                transformOrigin: "0 0",
              }}
              className="w-full h-full"
            >
              <iframe
                key={iframeKey}
                src={config.embedUrl}
                title="HG Radheshyam Das Discourse Calendar"
                className={cn(
                  "w-full h-full border-0 transition-opacity duration-300",
                  isLoading ? "opacity-0" : "opacity-100",
                )}
                onLoad={() => setIsLoading(false)}
                allow="autoplay"
              />
            </div>
          </div>
        </div>

        {/* Floating Quick Zoom & Fullscreen Controls Overlay (Bottom-Right) */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-background/90 backdrop-blur-md border border-border/80 shadow-lg rounded-2xl p-1 transition-all">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= ZOOM_MIN}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-30 active:scale-95"
            title="Zoom out"
            aria-label="Zoom out document"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 h-7 sm:h-8 rounded-xl text-xs font-mono font-bold hover:bg-muted text-foreground flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Click to reset document zoom to 100%"
          >
            {zoomPercentage}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= ZOOM_MAX}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-30 active:scale-95"
            title="Zoom in"
            aria-label="Zoom in document"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-border mx-0.5" />

          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center hover:bg-muted text-foreground transition-all cursor-pointer active:scale-95"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Helpful Hint Footer */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-foreground">Tip:</span> Use the{" "}
          <span className="font-semibold text-foreground">+</span> /{" "}
          <span className="font-semibold text-foreground">-</span> zoom buttons or preset pills above to scale the calendar document directly inside the viewer without affecting the rest of the website. If you prefer offline reading, tap{" "}
          <span className="font-semibold text-primary">"Download"</span> or{" "}
          <span className="font-semibold text-primary">"Open in Drive"</span>.
        </p>
      </div>
    </div>
  );
};
