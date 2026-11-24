import { useState } from "react";
import { useAudioConfiguration } from "@/hooks/use-audio";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];

export const SpeedControlPopover = ({
  compact,
}: {
  compact?: boolean;
} = {}) => {
  const [speedOpen, setSpeedOpen] = useState(false);
  const { playbackRate, setRate } = useAudioConfiguration();

  return (
    <Popover open={speedOpen} onOpenChange={setSpeedOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "font-bold cursor-pointer rounded-full shrink-0 flex items-center justify-center border border-sky-300/80 dark:border-sky-700/70 bg-sky-100/80 dark:bg-sky-950/50 text-sky-950 dark:text-sky-100 hover:bg-sky-200/70 transition-colors shadow-2xs",
            compact ? "text-[10px] h-6 px-1.5" : "text-xxs h-8 px-2.5",
          )}
        >
          {playbackRate}x
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-2 flex flex-col gap-1 bg-card"
        align="center"
        side="top"
        style={{ width: "8rem" }}
      >
        {SPEEDS.map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={() => {
              setRate(rate);
              setSpeedOpen(false);
            }}
            className={cn(
              "w-full text-left text-xs px-2.5 py-1.5 rounded-md transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground",
              playbackRate === rate
                ? "bg-muted font-bold text-primary"
                : "text-muted-foreground",
            )}
          >
            {rate}x
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};
