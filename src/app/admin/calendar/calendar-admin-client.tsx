"use client";

import {
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  Globe,
  Link as LinkIcon,
  Loader2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateCalendarConfig } from "@/app/actions/calendar-actions";
import {
  type CalendarViewerUrls,
  getCalendarViewerUrls,
} from "@/lib/calendar-utils";

interface CalendarAdminClientProps {
  initialConfig: CalendarViewerUrls & { updatedAt: string | null };
}

export const CalendarAdminClient = ({
  initialConfig,
}: CalendarAdminClientProps) => {
  const [url, setUrl] = useState(initialConfig.rawUrl);
  const [isPending, startTransition] = useTransition();
  const [savedConfig, setSavedConfig] = useState(initialConfig);

  const previewUrls = getCalendarViewerUrls(url);
  const isDirty = url.trim() !== savedConfig.rawUrl.trim();

  const handleSave = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Please enter a valid document URL.");
      return;
    }

    startTransition(async () => {
      try {
        await updateCalendarConfig(trimmed);
        const updated = {
          ...previewUrls,
          updatedAt: new Date().toISOString(),
        };
        setSavedConfig(updated);
        toast.success("HG RSP Calendar link updated successfully!", {
          description: "Public /calendar page has been revalidated.",
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to update calendar document link.");
      }
    });
  };

  const handleReset = () => {
    setUrl(savedConfig.rawUrl);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-amber-500/20 via-orange-500/20 to-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-xs shrink-0">
            <CalendarDays className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
              HG RSP Calendar & Schedule
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage the official discourse calendar document link displayed on the website.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>View Public /calendar</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Editor Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="calendar-url-input"
            className="text-sm font-bold text-foreground flex items-center gap-2"
          >
            <LinkIcon className="w-4 h-4 text-primary" />
            <span>Google Drive / Document Link</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Paste the shareable link of the Google Drive document, PDF, or spreadsheet. The system converts it into an interactive in-app preview without redirecting users to external Google Drive folders.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="calendar-url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="h-11 px-4 text-xs font-semibold rounded-xl border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !isDirty}
              className="h-11 px-5 inline-flex items-center gap-2 text-xs font-bold rounded-xl bg-linear-to-r from-amber-600 via-orange-600 to-amber-700 text-white hover:opacity-90 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status & Parsed Information */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border/70 text-xs">
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Detected File ID</span>
            <span className="font-mono font-bold text-foreground truncate">
              {previewUrls.fileId || "No ID detected"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Embed Mode</span>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Drive Preview</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Last Database Update</span>
            <span className="text-foreground">
              {savedConfig.updatedAt
                ? new Date(savedConfig.updatedAt).toLocaleString()
                : "Default initial link"}
            </span>
          </div>
        </div>
      </div>

      {/* Live Admin Preview */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Live Embed Preview
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={previewUrls.viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Test Open Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-border">•</span>
            <a
              href={previewUrls.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Test Download</span>
              <Download className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Embedded Iframe */}
        <div className="w-full rounded-xl border border-border overflow-hidden bg-background h-[550px]">
          <iframe
            src={previewUrls.embedUrl}
            title="Calendar Live Admin Preview"
            className="w-full h-full border-0"
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  );
};
