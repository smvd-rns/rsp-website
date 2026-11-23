import { describe, expect, it, vi } from "vitest";
import {
  createEncodeResult,
  getAdtsHeader,
  makeOpusHead,
  makeOpusTags,
  oggCrcTable,
  oggPage,
  processWasmPcmBlocks,
  resamplePCM,
} from "./audio-worker-common";

describe("audio-worker-common", () => {
  it("resamples PCM data when rates differ and returns same when rates match", () => {
    const channel1 = new Float32Array([0, 1, 0, -1]);
    const channel2 = new Float32Array([1, 0, -1, 0]);
    const input = [channel1, channel2];

    const sameRate = resamplePCM(input, 48000, 48000);
    expect(sameRate).toBe(input);

    const downsampled = resamplePCM(input, 48000, 24000);
    expect(downsampled.length).toBe(2);
    expect(downsampled[0].length).toBe(2);
  });

  it("creates ADTS header", () => {
    const header = getAdtsHeader(2, 44100, 500);
    expect(header.length).toBe(7);
    expect(header[0]).toBe(0xff);
    expect(header[1]).toBe(0xf1);

    const fallbackHeader = getAdtsHeader(1, 99999, 200);
    expect(fallbackHeader.length).toBe(7);
  });

  it("calculates ogg page and CRC table", () => {
    expect(oggCrcTable.length).toBe(256);

    const payload = new Uint8Array([1, 2, 3, 4, 5, 6]);
    const page = oggPage(payload, 12345, 0, 0n, 2);
    expect(page.length).toBeGreaterThan(payload.length);
    expect(page[0]).toBe(0x4f); // 'O'
    expect(page[1]).toBe(0x67); // 'g'
    expect(page[2]).toBe(0x67); // 'g'
    expect(page[3]).toBe(0x53); // 'S'
  });

  it("creates Opus Head and Tags buffers", () => {
    const head = makeOpusHead(2, 48000);
    expect(head.length).toBe(19);
    expect(head[0]).toBe(0x4f); // 'O'

    const tags = makeOpusTags();
    expect(tags.length).toBeGreaterThan(8);
  });

  it("processes WASM PCM blocks and creates encode result", () => {
    const channel = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const encoder = {
      encodeFloat: (pcm: Float32Array) => new Uint8Array(pcm.length),
    };
    const onPacket = vi.fn();
    const onProgress = vi.fn();

    processWasmPcmBlocks([channel], 2, onPacket, encoder, onProgress);
    expect(onPacket).toHaveBeenCalled();

    const result = createEncodeResult(
      new Uint8Array([1, 2, 3]),
      "audio/ogg",
      "opus-ogg",
      performance.now() - 100,
      10.5,
    );
    expect(result.format).toBe("opus-ogg");
    expect(result.time).toBeGreaterThanOrEqual(0);
    expect(result.blob).toBeDefined();
  });
});
