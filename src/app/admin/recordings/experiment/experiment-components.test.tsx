import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunList } from "./run-list";
import { TrackCard } from "./track-card";
import type { ConversionRun, Track } from "./types";

describe("Audio Experiment Components", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockTrack: Track = {
    id: "track-1",
    name: "lecture.mp3",
    size: 1048576,
    duration: 120,
    sampleRate: 44100,
    channels: 2,
    channelsData: [new Float32Array(100), new Float32Array(100)],
    url: "blob:http://localhost/mock-audio",
    startCropTime: 0,
    endCropTime: 120,
  };

  const mockRun: ConversionRun = {
    id: "run-1",
    trackId: "track-1",
    trackName: "lecture.mp3",
    format: "native-webm",
    targetBitrate: 96,
    cropDuration: 120,
    status: "completed",
    progress: 100,
    result: {
      size: 500000,
      achievedBitrate: 94,
      time: 1500,
      savings: "50%",
      url: "blob:http://localhost/audio-blob",
    },
  };

  it("renders TrackCard and updates crop & conversion format", () => {
    const onRemove = vi.fn();
    const onUpdateCrop = vi.fn();
    const onStartConversion = vi.fn();

    render(
      <TrackCard
        track={mockTrack}
        onRemove={onRemove}
        onUpdateCrop={onUpdateCrop}
        onStartConversion={onStartConversion}
      />,
    );

    expect(screen.getByText("lecture.mp3")).toBeDefined();
    expect(screen.getByText(/44100 Hz/i)).toBeDefined();

    const convertBtn = screen.getByRole("button", {
      name: /optimize & convert/i,
    });
    fireEvent.click(convertBtn);

    expect(onStartConversion).toHaveBeenCalledWith(
      mockTrack,
      "native-webm",
      96,
    );
  });

  it("renders RunList and handles remove", () => {
    const onRemoveRun = vi.fn();
    render(<RunList runs={[mockRun]} onRemoveRun={onRemoveRun} />);

    expect(screen.getByText("lecture.mp3")).toBeDefined();
    expect(screen.getByText(/Background Optimization Runs/i)).toBeDefined();

    const removeBtn = screen.getAllByRole("button")[0];
    fireEvent.click(removeBtn);

    expect(onRemoveRun).toHaveBeenCalledWith("run-1");
  });
});
