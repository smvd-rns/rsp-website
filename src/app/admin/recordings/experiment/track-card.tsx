// src/app/(admin)/recordings/experiment/track-card.tsx
"use client";

import { ArrowRight, Sliders, Trash2, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatBytes } from "@/lib/utils";
import type { ConversionRun, Track } from "./types";

interface TrackCardProps {
  track: Track;
  onRemove: (id: string) => void;
  onUpdateCrop: (id: string, field: "start" | "end", value: number) => void;
  onStartConversion: (
    track: Track,
    format: ConversionRun["format"],
    bitrate: number,
  ) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getFormatRecommendation = (format: string, channels: number) => {
  if (
    format === "native-webm" ||
    format === "wasm-webm" ||
    format === "wasm-ogg"
  ) {
    return channels === 1
      ? "Opus Mono: 24–32 kbps recommended"
      : "Opus Stereo: 48–64 kbps (Speech), 96–112 kbps (Music) recommended";
  }
  if (format === "native-aac") {
    return channels === 1
      ? "AAC Mono: 64 kbps recommended"
      : "AAC Stereo: 128–192 kbps recommended";
  }
  return "";
};

const getRecommendedBitrate = (format: string, channels: number): number => {
  if (
    format === "native-webm" ||
    format === "wasm-webm" ||
    format === "wasm-ogg"
  ) {
    return channels === 1 ? 32 : 96;
  }
  if (format === "native-aac") {
    return channels === 1 ? 64 : 128;
  }
  return 96;
};

export const TrackCard = ({
  track,
  onRemove,
  onUpdateCrop,
  onStartConversion,
}: TrackCardProps) => {
  const [format, setFormat] = useState<ConversionRun["format"]>("native-webm");
  const [bitrate, setBitrate] = useState<number>(96);

  const cropDur = track.endCropTime - track.startCropTime;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm truncate pr-2 text-foreground">
              {track.name}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {track.channels === 1 ? "Mono" : "Stereo"} • {track.sampleRate} Hz
              • {formatBytes(track.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(track.id)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-muted/30 p-2.5 rounded-lg border border-border">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Volume2 className="h-3 w-3" />
            Original Audio Preview
          </p>
          <audio src={track.url} controls className="h-8 w-full" />
        </div>

        {/* Trimming / Cropping UI */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Sliders className="h-3.5 w-3.5 text-emerald-600" />
              PCM Crop Range (Seconds)
            </span>
            <span className="text-muted-foreground">
              {formatTime(track.startCropTime)} -{" "}
              {formatTime(track.endCropTime)} ({Math.round(cropDur)}s /{" "}
              {Math.round(track.duration)}s)
            </span>
          </div>

          {/* Shadcn UI Range Slider */}
          <div className="px-1.5 py-2">
            <Slider
              value={[track.startCropTime, track.endCropTime]}
              min={0}
              max={track.duration}
              step={0.1}
              onValueChange={([start, end]) => {
                onUpdateCrop(track.id, "start", start);
                onUpdateCrop(track.id, "end", end);
              }}
              className="py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">
                Start Offset (s)
              </Label>
              <Input
                type="number"
                min={0}
                max={track.endCropTime - 0.1}
                step="any"
                value={Number(track.startCropTime.toFixed(2))}
                onChange={(e) =>
                  onUpdateCrop(track.id, "start", Number(e.target.value))
                }
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">
                End Offset (s)
              </Label>
              <Input
                type="number"
                min={track.startCropTime + 0.1}
                max={track.duration}
                step="any"
                value={Number(track.endCropTime.toFixed(2))}
                onChange={(e) =>
                  onUpdateCrop(track.id, "end", Number(e.target.value))
                }
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>
        </div>

        {/* Formats and Bitrate Settings */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Format / Encoder
            </Label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={format}
              onChange={(e) =>
                setFormat(e.target.value as ConversionRun["format"])
              }
            >
              <option value="native-webm">WebM (Native Opus)</option>
              <option value="wasm-ogg">Ogg (WASM Opus)</option>
              <option value="wasm-webm">WebM (WASM Opus)</option>
              <option value="native-aac">M4A (Native AAC)</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Bitrate (kbps)
            </Label>
            <Input
              type="number"
              min={16}
              max={320}
              value={bitrate}
              onChange={(e) => setBitrate(Number(e.target.value))}
              className="h-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* Bitrate Recommendation */}
        <div className="flex items-center justify-between text-[10px] pt-1">
          <span className="text-emerald-600 font-medium truncate">
            {getFormatRecommendation(format, track.channels)}
          </span>
          <button
            type="button"
            onClick={() =>
              setBitrate(getRecommendedBitrate(format, track.channels))
            }
            className="text-primary hover:underline font-semibold flex items-center gap-0.5 ml-1 flex-shrink-0 cursor-pointer"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="button"
          onClick={() => onStartConversion(track, format, bitrate)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 flex items-center gap-1.5"
        >
          Optimize & Convert
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
