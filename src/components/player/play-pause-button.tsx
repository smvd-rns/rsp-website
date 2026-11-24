"use client";

import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioPlayback } from "@/hooks/use-audio";
import { cn } from "@/lib/utils";

export function PlayPauseButton({
  className,
}: {
  className?: string;
} = {}) {
  const { isPlaying, togglePlay } = useAudioPlayback();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={togglePlay}
      className={cn(
        "rounded-full shrink-0 justify-center items-center flex bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-xs h-8 w-8 cursor-pointer transition-transform active:scale-95",
        className,
      )}
    >
      {isPlaying ? (
        <Pause className="w-3.5 h-3.5" />
      ) : (
        <Play className="w-3.5 h-3.5 ml-0.5" />
      )}
    </Button>
  );
}
