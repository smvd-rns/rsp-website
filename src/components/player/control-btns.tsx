import { Minimize2, X } from "lucide-react";
import { audioEngine } from "@/lib/audio-engine";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { SpeedControlPopover } from "./speed-controls";
import { VolumeControlPopover } from "./volume-controls";

type ControlBtnsProps = {
  handleMinimizeToggle: (minimized: boolean) => void;
  forMobile?: boolean;
};
export const ControlBtns = ({
  handleMinimizeToggle,
  forMobile,
}: ControlBtnsProps) => (
  <div
    className={cn(
      "items-center shrink-0",
      forMobile ? "flex md:hidden gap-0.5 sm:gap-1" : "hidden md:flex gap-1.5",
    )}
  >
    <SpeedControlPopover compact={forMobile} />
    <VolumeControlPopover compact={forMobile} />
    <Button
      variant="ghost"
      size="icon"
      onClick={() => handleMinimizeToggle(true)}
      className={cn(
        "rounded-full flex items-center justify-center cursor-pointer text-sky-900/80 hover:text-sky-950 dark:text-sky-200/80 dark:hover:text-sky-100 hover:bg-sky-200/50 dark:hover:bg-sky-900/40 transition-colors",
        forMobile ? "h-6 w-6" : "h-8 w-8",
      )}
      title="Minimize Player"
    >
      <Minimize2 className={forMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      onClick={() => audioEngine.dismiss()}
      className={cn(
        "rounded-full flex items-center justify-center cursor-pointer text-sky-900/80 hover:text-sky-950 dark:text-sky-200/80 dark:hover:text-sky-100 hover:bg-sky-200/50 dark:hover:bg-sky-900/40 transition-colors",
        forMobile ? "h-6 w-6" : "h-8 w-8",
      )}
      title="Dismiss Player"
    >
      <X className={forMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
    </Button>
  </div>
);
