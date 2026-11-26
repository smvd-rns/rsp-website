"use client";

import {
  CalendarDays,
  Download,
  ExternalLink,
  Info,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCw,
} from "lucide-react";
import { useState } from "react";
import type { CalendarViewerUrls } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface CalendarClientProps {
  config: CalendarViewerUrls & { updatedAt: string | null };
}

export const CalendarClient = ({ config }: CalendarClientProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

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
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer shadow-xs active:scale-95"
            title="Reload calendar preview"
          >
            <RotateCw className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Refresh</span>
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
                <span>Fullscreen</span>
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

        {/* Embedded Google Drive / Docs Viewer */}
        <iframe
          key={iframeKey}
          src={config.embedUrl}
          title="HG Radheshyam Das Discourse Calendar"
          className={cn(
            "w-full border-0 transition-opacity duration-300",
            isFullscreen ? "h-[85vh]" : "h-[72vh] md:h-[82vh]",
            isLoading ? "opacity-0" : "opacity-100",
          )}
          onLoad={() => setIsLoading(false)}
          allow="autoplay"
        />
      </div>

      {/* Helpful Hint Footer */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-foreground">Tip:</span> If you are viewing on a mobile phone, you can scroll within the preview or tap{" "}
          <span className="font-semibold text-primary">"Open in Drive"</span> to view the original live document or export it offline.
        </p>
      </div>
    </div>
  );
};
