// src/app/(admin)/recordings/experiment/page.tsx
"use client";

import { Info, Layers, Loader2, Sparkles, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTrackedObjectURLs } from "@/hooks/use-tracked-object-urls";
import { toast } from "@/lib/toast";
import { getSavings } from "@/lib/utils";
import { RunList } from "./run-list";
import { TrackCard } from "./track-card";
import type { ConversionRun, Track } from "./types";

export default function AudioExperimentPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [runs, setRuns] = useState<ConversionRun[]>([]);
  const [isDecoding, setIsDecoding] = useState<boolean>(false);
  const [decodingStatus, setDecodingStatus] = useState<string>("");

  const { createTrackedObjectURL } = useTrackedObjectURLs();

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsDecoding(true);
    setDecodingStatus("Decoding audio file to PCM...");

    // Yield event loop to React for updating decoding state UI immediately

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const audioCtx = new (
          window.AudioContext ||
          (
            window as unknown as Window & {
              webkitAudioContext: typeof AudioContext;
            }
          ).webkitAudioContext
        )();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const channels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;

        const channelsData: Float32Array[] = [];
        for (let c = 0; c < channels; c++) {
          channelsData.push(new Float32Array(audioBuffer.getChannelData(c)));
        }

        const trackId = Math.random().toString(36).substring(7);
        const originalUrl = createTrackedObjectURL(file);

        const newTrack: Track = {
          id: trackId,
          name: file.name,
          size: file.size,
          duration,
          channels,
          sampleRate,
          channelsData,
          url: originalUrl,
          startCropTime: 0,
          endCropTime: duration,
        };

        setTracks((prev) => [...prev, newTrack]);
        toast.success(`Loaded: ${file.name}`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("Audio decoding failed:", err);
        toast.error(`Decoding failed for ${file.name}: ${errMsg}`);
      }
    }

    setIsDecoding(false);
    setDecodingStatus("");

    // Reset file input
    e.target.value = "";
  };

  const handleStartConversion = (
    track: Track,
    format: ConversionRun["format"],
    targetBitrate: number,
  ) => {
    const runId = Math.random().toString(36).substring(7);
    const cropDuration = track.endCropTime - track.startCropTime;

    const newRun: ConversionRun = {
      id: runId,
      trackId: track.id,
      trackName: track.name,
      format,
      targetBitrate,
      status: "processing",
      progress: 0,
      cropDuration,
    };

    setRuns((prev) => [newRun, ...prev]);

    // Slice PCM channels data in memory
    const startSample = Math.floor(track.startCropTime * track.sampleRate);
    const endSample = Math.min(
      track.channelsData[0].length,
      Math.floor(track.endCropTime * track.sampleRate),
    );

    const croppedChannels = track.channelsData.map((ch) =>
      ch.slice(startSample, endSample),
    );
    const transferBuffers = croppedChannels.map((ch) => ch.buffer);

    // Decide which worker to spawn (Native vs WASM)
    const isNative = format === "native-webm" || format === "native-aac";
    const worker = isNative
      ? new Worker(new URL("@/workers/audio-native.worker.ts", import.meta.url))
      : new Worker(new URL("@/workers/audio-wasm.worker.ts", import.meta.url));

    worker.onmessage = (event) => {
      const data = event.data;
      if (data.type === "progress") {
        setRuns((prev) =>
          prev.map((r) =>
            r.id === runId ? { ...r, progress: data.progress } : r,
          ),
        );
      } else if (data.type === "completed") {
        const { result } = data;
        const url = createTrackedObjectURL(result.blob);

        // Adjust baseline original size proportionally to the crop duration
        const cropProportion = cropDuration / track.duration;
        const baselineSize = track.size * cropProportion;

        setRuns((prev) =>
          prev.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  status: "completed",
                  progress: 100,
                  result: {
                    size: result.blob.size,
                    achievedBitrate: result.achievedBitrate,
                    time: result.time,
                    savings: getSavings(baselineSize, result.blob.size),
                    url,
                  },
                }
              : r,
          ),
        );
        worker.terminate();
        toast.success(`Optimized: ${track.name} (${format.toUpperCase()})`);
      } else if (data.type === "error") {
        setRuns((prev) =>
          prev.map((r) =>
            r.id === runId ? { ...r, status: "error", error: data.error } : r,
          ),
        );
        worker.terminate();
        toast.error(`Encoding failed: ${data.error}`);
      }
    };

    worker.postMessage(
      {
        type: "start",
        format,
        channelsData: croppedChannels,
        sampleRate: track.sampleRate,
        targetBitrate: targetBitrate * 1000,
      },
      transferBuffers,
    );
  };

  const removeTrack = (id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setRuns((prev) => prev.filter((r) => r.trackId !== id));
  };

  const removeRun = (id: string) => {
    setRuns((prev) => prev.filter((r) => r.id !== id));
  };

  const updateCrop = (
    trackId: string,
    field: "start" | "end",
    value: number,
  ) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        let start = t.startCropTime;
        let end = t.endCropTime;
        if (field === "start") {
          start = Math.max(0, Math.min(value, end - 0.1));
        } else {
          end = Math.max(start + 0.1, Math.min(value, t.duration));
        }
        return { ...t, startCropTime: start, endCropTime: end };
      }),
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      {/* Google-like Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20 shadow-2xs">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              Audio Compression & Encoding Lab
            </h1>
            <p className="text-xs text-muted-foreground">
              Load original tracks, crop Float32 planar PCM buffers in-memory, and run Web Worker encoders.
            </p>
          </div>
        </div>
      </div>

      {/* Select file / Upload zone */}
      <div className="rounded-2xl border-2 border-border/80 bg-card p-6 shadow-2xs">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-input rounded-lg p-6 bg-muted/20">
          <Volume2 className="h-10 w-10 text-muted-foreground/80 mb-2" />
          <Label
            htmlFor="experiment-upload"
            className="text-sm font-semibold mb-1 text-foreground cursor-pointer hover:underline"
          >
            Upload Audio Track(s)
          </Label>
          <p className="text-xs text-muted-foreground mb-4">
            Supports MP3, WAV, M4A, FLAC. Files are parsed strictly client-side.
          </p>
          <Input
            id="experiment-upload"
            type="file"
            accept="audio/*"
            multiple
            onChange={handleAudioSelect}
            disabled={isDecoding}
            className="hidden"
          />
          <Button
            type="button"
            disabled={isDecoding}
            onClick={() =>
              document.getElementById("experiment-upload")?.click()
            }
            className="bg-primary text-primary-foreground"
          >
            {isDecoding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {decodingStatus}
              </>
            ) : (
              "Select Audio Files"
            )}
          </Button>
        </div>
      </div>

      {/* Decoded tracks grid */}
      {tracks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            Original Tracks In Memory
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onRemove={removeTrack}
                onUpdateCrop={updateCrop}
                onStartConversion={handleStartConversion}
              />
            ))}
          </div>
        </div>
      )}

      {/* Processed/Runs List */}
      {runs.length > 0 && <RunList runs={runs} onRemoveRun={removeRun} />}

      {/* Info notice box */}
      <div className="rounded-xl border border-border bg-muted/30 p-5 flex gap-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Audio Conversion Note</p>
          <p>
            Native browser conversion operates directly using the web browser's
            hardware-accelerated WebCodecs API with minimum CPU footprint.
            WebAssembly options run compiling-based encoders in separated worker
            threads, maintaining a fully responsive main user interface thread
            even while encoding massive audio channels.
          </p>
        </div>
      </div>
    </div>
  );
}
