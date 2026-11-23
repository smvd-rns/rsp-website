/** biome-ignore-all lint/a11y/useMediaCaption: ok */
"use client";

import {
  CheckCircle2,
  Headphones,
  RotateCcw,
  Upload,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { formatBytes } from "@/lib/utils";

export interface AudioFile {
  id: string;
  fileName: string;
  mimeType: string;
  deleted: boolean;
  size?: number;
  localFile?: File;
}

interface AudioUploadProps {
  audios: AudioFile[];
  onChange: (audios: AudioFile[]) => void;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
  onUploadSuccess?: (fileName: string) => void;
  onUploadStart?: (fileName: string) => void;
}

export const AudioUpload = ({
  audios,
  onChange,
  isUploading,
  onUploadSuccess,
  onUploadStart,
}: AudioUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const activeAudio = audios.find((a) => !a.deleted);
  const deletedAudios = audios.filter((a) => a.deleted);

  // Manage preview URL lifecycle
  useEffect(() => {
    if (!activeAudio) {
      setPreviewUrl(null);
      return;
    }

    if (activeAudio.localFile) {
      const url = URL.createObjectURL(activeAudio.localFile);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    if (activeAudio.id && !activeAudio.id.startsWith("http")) {
      setPreviewUrl(`/api/audio/${activeAudio.id}`);
      return;
    }

    if (activeAudio.id?.startsWith("http")) {
      setPreviewUrl(activeAudio.id);
      return;
    }

    setPreviewUrl(null);
  }, [activeAudio]);

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onUploadStart?.(file.name);

    const newAudio: AudioFile = {
      id: "",
      fileName: file.name,
      mimeType: file.type || "audio/mpeg",
      size: file.size,
      deleted: false,
      localFile: file,
    };

    onChange([...audios.map((a) => ({ ...a, deleted: true })), newAudio]);

    onUploadSuccess?.(file.name);
    toast.success(
      `Selected "${file.name}" locally. It will upload when you submit.`,
    );
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {activeAudio ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-5 text-emerald-950 dark:text-emerald-100 shadow-xs">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25 shadow-2xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate text-foreground">
                  {activeAudio.fileName}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  {activeAudio.size ? (
                    <span className="font-semibold text-foreground/80">
                      {formatBytes(activeAudio.size)}
                    </span>
                  ) : null}
                  <span>•</span>
                  {activeAudio.localFile ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Local File (Ready to upload on submit)
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] truncate">
                      Drive ID: {activeAudio.id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              className="rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 text-xs font-semibold cursor-pointer shadow-2xs shrink-0"
              onClick={() => {
                onChange(
                  audios.map((a) =>
                    a.id === activeAudio.id ||
                    a.fileName === activeAudio.fileName
                      ? { ...a, deleted: true }
                      : a,
                  ),
                );
              }}
            >
              Change Audio
            </Button>
          </div>

          {/* Local Audio Player Preview */}
          {previewUrl && (
            <div className="pt-2 border-t border-emerald-500/15 flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-emerald-600 shrink-0 hidden sm:block" />
              <audio
                controls
                src={previewUrl}
                className="h-8 w-full max-w-xl rounded-lg"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Label
            htmlFor="audio-upload"
            className="group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-sky-500/35 hover:border-sky-500/70 bg-sky-500/[0.03] hover:bg-sky-500/[0.07] rounded-2xl cursor-pointer transition-all duration-200 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-sky-500/20 shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Click to browse or drop discourse audio/video file
              </p>
              <p className="text-xs text-muted-foreground">
                File is kept in local state and uploaded to Google Drive when
                you press &quot;Create Recording&quot;
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/70">
                MP3
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/70">
                WAV
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/70">
                M4A
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/70">
                OPUS
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/70">
                MP4
              </span>
            </div>
            <Input
              id="audio-upload"
              type="file"
              accept="audio/*,video/*"
              onChange={handleAudioSelect}
              disabled={isUploading}
              className="hidden"
            />
          </Label>
        </div>
      )}

      {/* Previously Deleted Audios */}
      {deletedAudios.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Previous/Removed Audios
          </p>
          <div className="grid gap-2">
            {deletedAudios.map((a, i) => (
              <div
                key={a.id || `aud-${a.fileName}-${i}`}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 p-3 text-muted-foreground"
              >
                <Headphones className="h-4 w-4 text-muted-foreground/80" />
                <div className="min-w-0 flex-1 text-xs line-through truncate font-medium">
                  {a.fileName}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-emerald-600 hover:bg-emerald-500/10 text-xs font-semibold cursor-pointer"
                  onClick={() => {
                    onChange(
                      audios.map((x) => {
                        if (x === a) return { ...x, deleted: false };
                        if (!x.deleted) return { ...x, deleted: true };
                        return x;
                      }),
                    );
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
