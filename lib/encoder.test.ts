import { describe, it, expect } from 'vitest';
import { encodeWav, encodeMp3, encodeAudio } from './encoder';
import { createMockAudioBuffer } from '@/tests/helpers/audio-buffer';

describe('encodeWav', () => {
  it('produces a Blob with audio/wav MIME type', () => {
    const buf = createMockAudioBuffer({ length: 100, sampleRate: 44100 });
    const blob = encodeWav(buf);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/wav');
  });

  it('writes correct RIFF/WAVE header', async () => {
    const buf = createMockAudioBuffer({
      numberOfChannels: 1,
      length: 10,
      sampleRate: 44100,
    });
    const blob = encodeWav(buf);
    const ab = await blob.arrayBuffer();
    const view = new DataView(ab);

    // "RIFF" at offset 0
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');

    // Total size - 8
    const expectedDataSize = 10 * 1 * 2; // samples * channels * bytesPerSample
    expect(view.getUint32(4, true)).toBe(36 + expectedDataSize);

    // "WAVE" at offset 8
    expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE');

    // Audio format = PCM (1) at offset 20
    expect(view.getUint16(20, true)).toBe(1);

    // Num channels at offset 22
    expect(view.getUint16(22, true)).toBe(1);

    // Sample rate at offset 24
    expect(view.getUint32(24, true)).toBe(44100);

    // Bits per sample at offset 34
    expect(view.getUint16(34, true)).toBe(16);
  });

  it('converts float samples to int16 correctly', async () => {
    const samples = new Float32Array([0.0, 1.0, -1.0, 0.5, -0.5]);
    const buf = createMockAudioBuffer({
      numberOfChannels: 1,
      length: 5,
      sampleRate: 44100,
      channelData: [samples],
    });

    const blob = encodeWav(buf);
    const ab = await blob.arrayBuffer();
    const view = new DataView(ab);

    // Data starts at offset 44
    expect(view.getInt16(44, true)).toBe(0);          // 0.0
    expect(view.getInt16(46, true)).toBe(0x7FFF);     // 1.0 -> 32767
    expect(view.getInt16(48, true)).toBe(-0x8000);    // -1.0 -> -32768
    expect(view.getInt16(50, true)).toBe(16383);   // 0.5 * 0x7FFF = 16383.5, truncated to 16383
    expect(view.getInt16(52, true)).toBe(-16384);  // -0.5 * 0x8000 = -16384
  });

  it('interleaves stereo channels', async () => {
    const left  = new Float32Array([1.0, 0.0]);
    const right = new Float32Array([0.0, -1.0]);
    const buf = createMockAudioBuffer({
      numberOfChannels: 2,
      length: 2,
      sampleRate: 44100,
      channelData: [left, right],
    });

    const blob = encodeWav(buf);
    const ab = await blob.arrayBuffer();
    const view = new DataView(ab);

    // Interleaved: L0 R0 L1 R1
    expect(view.getInt16(44, true)).toBe(0x7FFF);  // L0 = 1.0
    expect(view.getInt16(46, true)).toBe(0);        // R0 = 0.0
    expect(view.getInt16(48, true)).toBe(0);        // L1 = 0.0
    expect(view.getInt16(50, true)).toBe(-0x8000);  // R1 = -1.0
  });

  it('calculates correct total file size', async () => {
    const buf = createMockAudioBuffer({
      numberOfChannels: 2,
      length: 100,
      sampleRate: 48000,
    });
    const blob = encodeWav(buf);
    // header(44) + samples(100) * channels(2) * bytesPerSample(2)
    expect(blob.size).toBe(44 + 100 * 2 * 2);
  });
});

describe('encodeMp3', () => {
  it('throws with not-supported error', async () => {
    const buf = createMockAudioBuffer({ length: 10, sampleRate: 44100 });
    await expect(encodeMp3(buf)).rejects.toThrow('MP3 encoding not yet supported');
  });
});

describe('encodeAudio', () => {
  it('routes wav format to encodeWav', async () => {
    const buf = createMockAudioBuffer({ length: 10, sampleRate: 44100 });
    const blob = await encodeAudio(buf, 'wav');
    expect(blob.type).toBe('audio/wav');
  });

  it('routes mp3 format to encodeMp3 (throws)', async () => {
    const buf = createMockAudioBuffer({ length: 10, sampleRate: 44100 });
    await expect(encodeAudio(buf, 'mp3')).rejects.toThrow('MP3 encoding not yet supported');
  });
});
