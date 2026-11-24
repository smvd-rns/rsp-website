"use client";

import { ExternalLink, Maximize2, Music, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAudioPlayback } from "@/hooks/use-audio";
import { useSpeakers } from "@/hooks/use-metadata";
import { audioEngine } from "@/lib/audio-engine";
import { categoryPath } from "@/lib/utils";
import { ControlBtns } from "./player/control-btns";
import { PlayPauseButton } from "./player/play-pause-button";
import { TimelineSlider } from "./player/timeline-slider";
import { Button } from "./ui/button";

export function AudioPlayerPanel() {
  const { currentRecording, categoryPath: categoryPathVal } =
    useAudioPlayback();
  const [isMinimized, setIsMinimized] = useState(false);
  const { data } = useSpeakers();
  const pathname = usePathname();

  const lastTrackIdRef = useRef<string | null>(null);
  const lastPathRef = useRef(pathname);

  // 1. Whenever user plays a track or starts playback -> ALWAYS open full player
  useEffect(() => {
    if (currentRecording?.id) {
      if (lastTrackIdRef.current !== currentRecording.id) {
        lastTrackIdRef.current = currentRecording.id;
        lastPathRef.current = pathname;
        setIsMinimized(false);
      }
    }
  }, [currentRecording?.id, pathname]);

  // 2. When moving to other pages while playing, automatically float on right side above navbar
  useEffect(() => {
    if (pathname !== lastPathRef.current && currentRecording?.id) {
      lastPathRef.current = pathname;
      setIsMinimized(true);
    }
  }, [pathname, currentRecording?.id]);

  const handleMinimizeToggle = (val: boolean) => {
    setIsMinimized(val);
  };

  // -------------------------------------------------------------
  // FLOATING MINIMIZED PILL (Sky Blue Gradient)
  // -------------------------------------------------------------
  if (isMinimized) {
    return (
      <div
        className="fixed z-50 bg-linear-to-r from-sky-500 via-sky-600 to-cyan-600 text-white shadow-2xl rounded-full border border-white/20 ring-2 ring-sky-400/30 flex items-center gap-2 p-1.5 pl-3 select-none backdrop-blur-xl bottom-20 md:bottom-6 right-3 sm:right-6 transition-all animate-in fade-in zoom-in-95 cursor-pointer"
        onClick={() => handleMinimizeToggle(false)}
      >
        {/* Clickable area to expand all controls */}
        <div
          className="flex items-center gap-2 text-white hover:text-sky-100 transition-all select-none"
          title="Expand audio controls"
        >
          <Music className="w-4 h-4 shrink-0 text-white animate-pulse" />
          <span
            className="text-xs font-bold truncate max-w-[110px] sm:max-w-[180px] drop-shadow-xs"
          >
            {currentRecording?.name || "Active Discourse"}
          </span>
          <Maximize2 className="w-3.5 h-3.5 shrink-0 opacity-80 hover:opacity-100" />
        </div>

        {/* Play/Pause inside minimized pill */}
        <div
          className="flex items-center gap-1 shrink-0 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <PlayPauseButton className="h-7 w-7 bg-white text-sky-600 hover:bg-white/90" />
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              audioEngine.dismiss();
            }}
            className="rounded-full h-7 w-7 text-white hover:bg-white/20 hover:text-white flex items-center justify-center cursor-pointer"
            title="Close Player"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FULL EXPANDED PLAYER (Sky Blue Theme)
  // -------------------------------------------------------------
  const title = currentRecording?.name || "Active Recording";
  const speakers =
    currentRecording?.speaker_ids
      ?.map((id) => data?.find((s) => s.id === id)?.name)
      .join(", ") || "HG Radheshyam Das";

  // Resolve navigation path
  const path = categoryPathVal ? categoryPath(categoryPathVal) : "";
  const href = path
    ? `${path}?q=${currentRecording?.id}`
    : `?q=${currentRecording?.id}`;

  return (
    <div
      className="fixed z-50 bottom-[4.35rem] inset-x-2 sm:inset-x-4 md:bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-5xl rounded-2xl border-2 border-sky-400 dark:border-sky-500 shadow-[0_8px_32px_rgba(0,0,0,0.22)] ring-1 ring-sky-300/50 bg-linear-to-r from-sky-50 via-sky-100/90 to-sky-50 dark:from-[#082f49] dark:via-[#0c4a6e] dark:to-[#082f49] backdrop-blur-xl px-3 py-2 sm:px-4 sm:py-2.5 select-none transition-all animate-in slide-in-from-bottom-5"
    >
      <div className="max-w-7xl mx-auto">
        {/* ========================================================= */}
        {/* MOBILE COMPACT VIEW (< md)                                 */}
        {/* Row 1: Play button + Title/Speaker + Speed/Vol/Min/Close    */}
        {/* Row 2: Compact Timeline Scrubber                           */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-1 md:hidden">
          {/* Row 1: Media Header */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Play/Pause button + Track Info */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <PlayPauseButton className="h-7 w-7 shrink-0 bg-linear-to-tr from-sky-500 via-sky-600 to-cyan-600 text-white shadow-xs" />
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  <h4
                    className="font-bold text-xs truncate text-sky-950 dark:text-sky-100 tracking-tight leading-tight"
                    title={title}
                  >
                    {title}
                  </h4>
                  <Link
                    href={href}
                    className="inline-flex items-center text-sky-700 dark:text-sky-300 hover:text-sky-900 transition-all cursor-pointer p-0.5 shrink-0"
                    title="Navigate to recording details"
                    prefetch={false}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <span
                  className="text-[10px] text-sky-800/80 dark:text-sky-200/80 truncate font-medium leading-tight"
                  title={speakers}
                >
                  {speakers}
                </span>
              </div>
            </div>

            {/* Right: Compact Action Buttons */}
            <ControlBtns {...{ handleMinimizeToggle }} forMobile />
          </div>

          {/* Row 2: Timeline Scrubber */}
          <TimelineSlider compact />
        </div>

        {/* ========================================================= */}
        {/* DESKTOP VIEW (>= md)                                      */}
        {/* Single Row: Title/Speaker | Play + Timeline | Actions     */}
        {/* ========================================================= */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* Metadata Section */}
          <div className="flex flex-col gap-0.5 min-w-0 max-w-xs xl:max-w-md">
            <div className="flex items-center gap-1.5">
              <h4
                className="font-bold text-sm truncate text-sky-950 dark:text-sky-100 tracking-tight"
                title={title}
              >
                {title}
              </h4>
              <Link
                href={href}
                className="inline-flex items-center text-sky-700 dark:text-sky-300 hover:text-sky-900 transition-all cursor-pointer rounded-md p-1 hover:bg-sky-200/60 shrink-0"
                title="Navigate to recording details"
                prefetch={false}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
            <span
              className="text-xs text-sky-800/80 dark:text-sky-200/80 truncate font-medium"
              title={speakers}
            >
              {speakers}
            </span>
          </div>

          {/* Center Play & Timeline */}
          <div className="flex items-center gap-3 flex-1 justify-center max-w-2xl">
            <PlayPauseButton className="h-9 w-9 shrink-0 bg-linear-to-tr from-sky-500 via-sky-600 to-cyan-600 text-white hover:brightness-105 shadow-xs" />
            <TimelineSlider />
          </div>

          {/* Right Action Buttons */}
          <ControlBtns {...{ handleMinimizeToggle }} />
        </div>
      </div>
    </div>
  );
}
