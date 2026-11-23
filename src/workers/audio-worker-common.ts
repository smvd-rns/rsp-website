// src/workers/audio-worker-common.ts

export const resamplePCM = (
  channelsData: Float32Array[],
  srcSampleRate: number,
  dstSampleRate: number,
): Float32Array[] => {
  if (srcSampleRate === dstSampleRate) {
    return channelsData;
  }
  const ratio = srcSampleRate / dstSampleRate;
  const srcLength = channelsData[0].length;
  const dstLength = Math.round(srcLength * (dstSampleRate / srcSampleRate));
  const numChannels = channelsData.length;

  const resampled: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    const src = channelsData[c];
    const dst = new Float32Array(dstLength);
    for (let i = 0; i < dstLength; i++) {
      const srcIndex = i * ratio;
      const indexLower = Math.floor(srcIndex);
      const indexUpper = Math.min(srcLength - 1, indexLower + 1);
      const weight = srcIndex - indexLower;
      dst[i] = src[indexLower] * (1 - weight) + src[indexUpper] * weight;
    }
    resampled.push(dst);
  }
  return resampled;
};

export const getAdtsHeader = (
  channelCount: number,
  sampleRate: number,
  packetLength: number,
): Uint8Array => {
  const sampleRates = [
    96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025,
    8000, 7350,
  ];
  let sampleRateIndex = sampleRates.indexOf(sampleRate);
  if (sampleRateIndex === -1) {
    sampleRateIndex = 4; // default to 44100
  }
  const profile = 2; // AAC LC
  const frameLength = packetLength + 7;
  const header = new Uint8Array(7);
  header[0] = 0xff; // Syncword (12 bits)
  header[1] = 0xf1; // Syncword, MPEG-4, layer 0, no protection
  header[2] =
    ((profile - 1) << 6) | (sampleRateIndex << 2) | (channelCount >> 2);
  header[3] = ((channelCount & 3) << 6) | (frameLength >> 11);
  header[4] = (frameLength >> 3) & 0xff;
  header[5] = ((frameLength & 7) << 5) | 0x1f;
  header[6] = 0xfc;
  return header;
};

export const oggCrcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) {
      r = (r << 1) ^ (r >>> 31 ? 0x04c11db7 : 0);
    }
    table[i] = r >>> 0;
  }
  return table;
})();

export const oggPage = (
  payload: Uint8Array,
  serial: number,
  seq: number,
  granule: bigint,
  flags: number,
): Uint8Array => {
  const segs = [];
  let rem = payload.length;
  while (rem >= 255) {
    segs.push(255);
    rem -= 255;
  }
  segs.push(rem);

  const hdrLen = 27 + segs.length;
  const page = new Uint8Array(hdrLen + payload.length);
  const dv = new DataView(page.buffer);

  page[0] = 0x4f; // "OggS"
  page[1] = 0x67;
  page[2] = 0x67;
  page[3] = 0x53;
  page[4] = 0; // version
  page[5] = flags;

  dv.setBigInt64(6, granule, true);
  dv.setUint32(14, serial, true);
  dv.setUint32(18, seq, true);
  dv.setUint32(22, 0, true); // CRC placeholder
  page[26] = segs.length;

  for (let i = 0; i < segs.length; i++) {
    page[27 + i] = segs[i];
  }
  page.set(payload, hdrLen);

  let crc = 0;
  for (let i = 0; i < page.length; i++) {
    crc = (crc << 8) ^ oggCrcTable[((crc >>> 24) & 0xff) ^ page[i]];
  }
  dv.setUint32(22, crc >>> 0, true);

  return page;
};

export const makeOpusHead = (
  channelCount: number,
  sampleRate: number,
): Uint8Array => {
  const buf = new Uint8Array(19);
  const dv = new DataView(buf.buffer);
  const magic = [0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64]; // "OpusHead"
  buf.set(magic, 0);
  buf[8] = 1; // version
  buf[9] = channelCount;
  dv.setUint16(10, 312, true); // pre-skip
  dv.setUint32(12, sampleRate, true);
  dv.setUint16(16, 0, true); // output gain
  buf[18] = 0; // channel mapping family
  return buf;
};

export const makeOpusTags = (): Uint8Array => {
  const vendor = "WebAudioOpus";
  const vendorBytes = new TextEncoder().encode(vendor);
  const buf = new Uint8Array(8 + 4 + vendorBytes.length + 4);
  const dv = new DataView(buf.buffer);
  const magic = [0x4f, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73]; // "OpusTags"
  buf.set(magic, 0);
  dv.setUint32(8, vendorBytes.length, true);
  buf.set(vendorBytes, 12);
  dv.setUint32(12 + vendorBytes.length, 0, true); // 0 user comments
  return buf;
};

export const processPlanarFrames = (
  resampledData: Float32Array[],
  sampleRate: number,
  frameSize: number,
  encoder: AudioEncoder,
  onProgress?: (pct: number) => void,
) => {
  const channels = resampledData.length;
  const totalSamples = resampledData[0].length;
  const pcmBuffer = new Float32Array(frameSize * channels);
  let offset = 0;
  let timestamp = 0;

  while (offset < totalSamples) {
    const currentBlockSize = Math.min(frameSize, totalSamples - offset);
    pcmBuffer.fill(0);

    for (let c = 0; c < channels; c++) {
      const channelData = resampledData[c];
      const slice = channelData.subarray(offset, offset + currentBlockSize);
      pcmBuffer.set(slice, c * frameSize);
    }

    const audioData = new AudioData({
      format: "f32-planar",
      sampleRate,
      numberOfChannels: channels,
      numberOfFrames: frameSize,
      timestamp,
      data: pcmBuffer,
    });

    encoder.encode(audioData);
    audioData.close();

    offset += frameSize;
    timestamp = Math.round((offset / sampleRate) * 1000000);

    if (offset % (frameSize * 50) === 0 && onProgress) {
      onProgress(Math.min(90, Math.round((offset / totalSamples) * 90)));
    }
  }
};

export const processWasmPcmBlocks = (
  resampledOpus: Float32Array[],
  frameSize: number,
  onPacket: (packet: Uint8Array, offset: number, frameSize: number) => void,
  encoder: { encodeFloat: (pcm: Float32Array) => Uint8Array | null },
  onProgress?: (pct: number) => void,
) => {
  const channels = resampledOpus.length;
  const totalSamples = resampledOpus[0].length;
  const pcmFloat = new Float32Array(frameSize * channels);
  let offset = 0;

  while (offset < totalSamples) {
    const currentBlockSize = Math.min(frameSize, totalSamples - offset);
    pcmFloat.fill(0);

    for (let i = 0; i < currentBlockSize; i++) {
      for (let c = 0; c < channels; c++) {
        let s = resampledOpus[c][offset + i];
        s = s < -1 ? -1 : s > 1 ? 1 : s;
        pcmFloat[i * channels + c] = s;
      }
    }

    const packet = encoder.encodeFloat(pcmFloat);
    if (packet && packet.length > 0) {
      onPacket(packet, offset, frameSize);
    }

    offset += frameSize;

    if (offset % (frameSize * 50) === 0 && onProgress) {
      onProgress(Math.min(90, Math.round((offset / totalSamples) * 90)));
    }
  }
};

export const createEncodeResult = (
  buffer: ArrayBuffer | Uint8Array,
  mimeType: string,
  format: string,
  startTime: number,
  duration: number,
) => {
  const elapsed = performance.now() - startTime;
  const blob = new Blob([buffer as BlobPart], { type: mimeType });
  return {
    blob,
    format,
    time: Math.round(elapsed),
    achievedBitrate: Math.round((blob.size * 8) / duration / 1000),
  };
};
