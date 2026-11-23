// src/app/(admin)/recordings/experiment/run-list.tsx
"use client";

import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import type { ConversionRun } from "./types";

interface RunListProps {
  runs: ConversionRun[];
  onRemoveRun: (id: string) => void;
}

export const RunList = ({ runs, onRemoveRun }: RunListProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">
        Background Optimization Runs
      </h2>
      <div className="space-y-3">
        {runs.map((run) => (
          <div
            key={run.id}
            className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-sm text-foreground truncate max-w-md">
                  {run.trackName}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 uppercase">
                  Target: {run.format.replace("-", " ")} @ {run.targetBitrate}{" "}
                  kbps • Crop Duration: {Math.round(run.cropDuration)}s
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemoveRun(run.id)}
                disabled={run.status === "processing"}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Processing State */}
            {run.status === "processing" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500 flex-shrink-0" />
                  <span>Transcoding progress...</span>
                  <span className="font-semibold">{run.progress}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-150 rounded-full"
                    style={{ width: `${run.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error State */}
            {run.status === "error" && (
              <div className="flex items-start gap-2.5 text-xs text-danger bg-danger/5 border border-danger/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Transcoding Error</p>
                  <p className="opacity-90">{run.error}</p>
                </div>
              </div>
            )}

            {/* Completed State */}
            {run.status === "completed" && run.result && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/40 p-4 rounded-xl border border-border">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Optimized Size
                    </p>
                    <p className="text-sm font-bold text-foreground flex items-center gap-1">
                      {formatBytes(run.result.size)}
                      <span className="text-[10px] text-emerald-600 font-medium">
                        {run.result.savings}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Achieved Bitrate
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {run.result.achievedBitrate} kbps
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Encoding Speed
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {run.result.time} ms
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Format Extension
                    </p>
                    <p className="text-sm font-bold text-foreground uppercase">
                      .
                      {run.result.url
                        ? run.format.includes("aac")
                          ? "m4a"
                          : run.format.includes("ogg")
                            ? "ogg"
                            : "webm"
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <audio src={run.result.url} controls className="h-8 flex-1" />
                  <Button
                    type="button"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = run.result?.url ?? "";
                      const ext = run.format.includes("aac")
                        ? "m4a"
                        : run.format.includes("ogg")
                          ? "ogg"
                          : "webm";
                      a.download = `${run.trackName.replace(/\.[^/.]+$/, "")}_optimized.${ext}`;
                      a.click();
                    }}
                    className="bg-primary text-primary-foreground text-xs h-8 px-3"
                  >
                    Download File
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
