// src/workers/audio-native.worker.ts
import { ArrayBufferTarget, Muxer } from "webm-muxer";
import {
  createEncodeResult,
  getAdtsHeader,
  processPlanarFrames,
  resamplePCM,
} from "./audio-worker-common";

// Native WebCodecs Opus WebM Encoder
const encodeOpusNative = async (
  channelsData: Float32Array[],
  srcSampleRate: number,
  targetBitrate: number,
  duration: number,
) => {
  const startTime = performance.now();
  const channels = channelsData.length;
  const resampledOpus = resamplePCM(channelsData, srcSampleRate, 48000);

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    audio: {
      codec: "A_OPUS",
      sampleRate: 48000,
      numberOfChannels: channels,
    },
  });

  const encoder = new AudioEncoder({
    output: (chunk, metadata) => {
      muxer.addAudioChunk(chunk, metadata);
    },
    error: (err) => {
      console.error("Native Opus encoding error:", err);
      postMessage({ type: "error", error: err.message || String(err) });
    },
  });

  encoder.configure({
    codec: "opus",
    sampleRate: 48000,
    numberOfChannels: channels,
    bitrate: targetBitrate,
    bitrateMode: "variable",
  });

  postMessage({ type: "progress", progress: 0 });

  processPlanarFrames(resampledOpus, 48000, 960, encoder, (pct) =>
    postMessage({ type: "progress", progress: pct }),
  );

  postMessage({ type: "progress", progress: 95 });
  await encoder.flush();
  encoder.close();
  muxer.finalize();

  postMessage({ type: "progress", progress: 100 });
  return createEncodeResult(
    target.buffer,
    "audio/webm",
    "webm",
    startTime,
    duration,
  );
};

// Native WebCodecs AAC Encoder (M4A)
const encodeAACNative = async (
  channelsData: Float32Array[],
  srcSampleRate: number,
  targetBitrate: number,
  duration: number,
) => {
  const startTime = performance.now();
  const channels = channelsData.length;
  const resampledAAC = resamplePCM(channelsData, srcSampleRate, 44100);
  const aacChunks: Uint8Array[] = [];

  const encoder = new AudioEncoder({
    output: (chunk) => {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      const adtsHeader = getAdtsHeader(channels, 44100, chunk.byteLength);
      const fullFrame = new Uint8Array(7 + chunk.byteLength);
      fullFrame.set(adtsHeader, 0);
      fullFrame.set(data, 7);
      aacChunks.push(fullFrame);
    },
    error: (err) => {
      console.error("Native AAC encoding error:", err);
      postMessage({ type: "error", error: err.message || String(err) });
    },
  });

  encoder.configure({
    codec: "mp4a.40.2",
    sampleRate: 44100,
    numberOfChannels: channels,
    bitrate: targetBitrate,
  });

  postMessage({ type: "progress", progress: 0 });

  processPlanarFrames(resampledAAC, 44100, 1024, encoder, (pct) =>
    postMessage({ type: "progress", progress: pct }),
  );

  postMessage({ type: "progress", progress: 95 });
  await encoder.flush();
  encoder.close();

  postMessage({ type: "progress", progress: 100 });
  return createEncodeResult(
    aacChunks as unknown as Uint8Array,
    "audio/aac",
    "aac",
    startTime,
    duration,
  );
};

self.onmessage = async (e: MessageEvent) => {
  const { type, channelsData, sampleRate, targetBitrate } = e.data;
  const format = e.data.format || "native-webm";

  if (type === "start") {
    const _activeChannels = channelsData.length;
    const duration = channelsData[0].length / sampleRate;

    try {
      if (typeof AudioEncoder === "undefined") {
        throw new Error(
          "WebCodecs is not supported in this browser. Please use Chrome, Edge, or Firefox.",
        );
      }

      let result: {
        blob: Blob;
        format: string;
        time: number;
        achievedBitrate: number;
      };
      if (format === "native-webm") {
        result = await encodeOpusNative(
          channelsData,
          sampleRate,
          targetBitrate,
          duration,
        );
      } else if (format === "native-aac") {
        result = await encodeAACNative(
          channelsData,
          sampleRate,
          targetBitrate,
          duration,
        );
      } else {
        throw new Error(`Unsupported format by native worker: ${format}`);
      }

      postMessage({
        type: "completed",
        result,
      });
    } catch (err) {
      console.error(`Native encoding failed (${format}):`, err);
      postMessage({
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
