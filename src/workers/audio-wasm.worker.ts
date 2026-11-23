// src/workers/audio-wasm.worker.ts
import { ArrayBufferTarget, Muxer } from "webm-muxer";
import {
  createEncodeResult,
  makeOpusHead,
  makeOpusTags,
  oggPage,
  processWasmPcmBlocks,
  resamplePCM,
} from "./audio-worker-common";

const concat = (arrays: Uint8Array[]): Uint8Array => {
  if (!arrays.length) return new Uint8Array(0);
  if (arrays.length === 1) return arrays[0];
  let n = 0;
  for (const a of arrays) n += a.length;
  const out = new Uint8Array(n);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
};

const createAudioChunk = (
  packet: Uint8Array,
  timestamp: number,
  duration: number,
) => {
  if (typeof EncodedAudioChunk !== "undefined") {
    return new EncodedAudioChunk({
      type: "key",
      timestamp,
      duration,
      data: packet,
    });
  }
  return {
    data: packet,
    type: "key",
    timestamp,
    duration,
  };
};

// biome-ignore lint/suspicious/noExplicitAny: dynamic import
let preloadedWasmModule: any = null;

const preloadWasm = async () => {
  if (!preloadedWasmModule) {
    preloadedWasmModule = await import("libopus-wasm");
  }
  return preloadedWasmModule;
};

const initOpusWasmEncoder = async (
  channelsData: Float32Array[],
  srcSampleRate: number,
  targetBitrate: number,
) => {
  const startTime = performance.now();
  const channels = channelsData.length;
  const mod = await preloadWasm();
  const encoder = await mod.createEncoder({
    sampleRate: 48000,
    channels: channels,
  });
  encoder.setBitrate(targetBitrate);
  const resampledOpus = resamplePCM(channelsData, srcSampleRate, 48000);

  return { startTime, channels, encoder, resampledOpus };
};

// 1. WASM Opus Ogg Encoder
const encodeOpusWasmOgg = async (
  channelsData: Float32Array[],
  srcSampleRate: number,
  targetBitrate: number,
  duration: number,
) => {
  const { startTime, channels, encoder, resampledOpus } =
    await initOpusWasmEncoder(channelsData, srcSampleRate, targetBitrate);

  const frameSize = 960;
  let granule = 0;
  let pageSeq = 0;
  const serial = (Math.random() * 0xffffffff) >>> 0;

  const headerPages: Uint8Array[] = [
    oggPage(makeOpusHead(channels, 48000), serial, pageSeq++, BigInt(0), 0x02),
    oggPage(makeOpusTags(), serial, pageSeq++, BigInt(0), 0x00),
  ];

  const pages: Uint8Array[] = [...headerPages];

  postMessage({ type: "progress", progress: 0 });

  processWasmPcmBlocks(
    resampledOpus,
    frameSize,
    (packet) => {
      granule += frameSize;
      pages.push(oggPage(packet, serial, pageSeq++, BigInt(granule), 0x00));
    },
    encoder,
    (pct) => postMessage({ type: "progress", progress: pct }),
  );

  postMessage({ type: "progress", progress: 95 });
  pages.push(
    oggPage(new Uint8Array(0), serial, pageSeq++, BigInt(granule), 0x04),
  );

  encoder.free();

  postMessage({ type: "progress", progress: 100 });
  return createEncodeResult(
    concat(pages) as unknown as Uint8Array,
    "audio/ogg",
    "ogg",
    startTime,
    duration,
  );
};

// 2. WASM Opus WebM Encoder
const encodeOpusWasmWebM = async (
  channelsData: Float32Array[],
  srcSampleRate: number,
  targetBitrate: number,
  duration: number,
) => {
  const { startTime, channels, encoder, resampledOpus } =
    await initOpusWasmEncoder(channelsData, srcSampleRate, targetBitrate);

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    audio: {
      codec: "A_OPUS",
      sampleRate: 48000,
      numberOfChannels: channels,
    },
  });

  const frameSize = 960;

  postMessage({ type: "progress", progress: 0 });

  processWasmPcmBlocks(
    resampledOpus,
    frameSize,
    (packet, offset) => {
      const timestamp = Math.round((offset / 48000) * 1000000);
      const chunk = createAudioChunk(
        packet,
        timestamp,
        Math.round((frameSize / 48000) * 1000000),
      );
      muxer.addAudioChunk(chunk as EncodedAudioChunk);
    },
    encoder,
    (pct) => postMessage({ type: "progress", progress: pct }),
  );

  postMessage({ type: "progress", progress: 95 });
  encoder.free();
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

self.onmessage = async (e: MessageEvent) => {
  const { type, format, channelsData, sampleRate, targetBitrate } = e.data;

  if (type === "start") {
    const duration = channelsData[0].length / sampleRate;

    try {
      let result: {
        blob: Blob;
        format: string;
        time: number;
        achievedBitrate: number;
      };
      if (format === "wasm-ogg") {
        result = await encodeOpusWasmOgg(
          channelsData,
          sampleRate,
          targetBitrate,
          duration,
        );
      } else if (format === "wasm-webm") {
        result = await encodeOpusWasmWebM(
          channelsData,
          sampleRate,
          targetBitrate,
          duration,
        );
      } else {
        throw new Error(`Unsupported format by WASM worker: ${format}`);
      }

      postMessage({
        type: "completed",
        result,
      });
    } catch (err) {
      console.error(`WASM encoding failed (${format}):`, err);
      postMessage({
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
