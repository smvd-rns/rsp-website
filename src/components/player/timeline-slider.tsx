"use client";

import { Slider } from "@/components/ui/slider";
import { useAudioTimeline } from "@/hooks/use-audio";
import { cn } from "@/lib/utils";

const formatTime = (secs: number) => {
  if (Number.isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export const TimelineSlider = ({
  compact,
}: {
  compact?: boolean;
} = {}) => {
  const { currentTime, duration, seek } = useAudioTimeline();

  const handleValueChange = (values: number[]) => {
    if (values[0] !== undefined) {
      seek(values[0]);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center",
        compact ? "gap-1.5 w-full" : "gap-2 md:w-72",
      )}
      style={{ minWidth: compact ? "100%" : "160px", flexGrow: 1 }}
    >
      <span
        className={cn(
          "text-sky-900/80 dark:text-sky-200/70 shrink-0 font-mono select-none",
          compact ? "text-[10px] min-w-7 text-right" : "text-xxs min-w-8 text-right",
        )}
      >
        {formatTime(currentTime)}
      </span>

      <Slider
        value={[currentTime]}
        min={0}
        max={duration || 100}
        step={1}
        onValueChange={handleValueChange}
        className="cursor-pointer flex-1"
        aria-label="Audio timeline slider"
      />

      <span
        className={cn(
          "text-sky-900/80 dark:text-sky-200/70 shrink-0 font-mono select-none",
          compact ? "text-[10px] min-w-7 text-left" : "text-xxs min-w-8 text-left",
        )}
      >
        {formatTime(duration)}
      </span>
    </div>
  );
};
