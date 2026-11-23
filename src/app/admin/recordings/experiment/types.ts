// src/app/(admin)/recordings/experiment/types.ts
export interface Track {
  id: string;
  name: string;
  size: number;
  duration: number;
  channels: number;
  sampleRate: number;
  channelsData: Float32Array[];
  url: string;
  startCropTime: number;
  endCropTime: number;
}

export interface ConversionRun {
  id: string;
  trackId: string;
  trackName: string;
  format: "native-webm" | "wasm-ogg" | "wasm-webm" | "native-aac";
  targetBitrate: number;
  status: "processing" | "completed" | "error";
  progress: number;
  cropDuration: number;
  result?: {
    size: number;
    achievedBitrate: number;
    time: number;
    savings: string;
    url: string;
  };
  error?: string;
}
