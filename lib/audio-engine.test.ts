import { describe, it, expect } from 'vitest';
import { trimAudio } from './audio-engine';
import { createMockAudioBuffer } from '@/tests/helpers/audio-buffer';

describe('trimAudio', () => {
  it('trims a mono buffer to the specified time range', () => {
    // 1 second of audio at 100 Hz sample rate (100 samples)
    const data = Float32Array.from({ length: 100 }, (_, i) => i / 100);
    const buf = createMockAudioBuffer({
      numberOfChannels: 1,
      length: 100,
      sampleRate: 100,
      channelData: [data],
    });

    // Trim to 0.2s – 0.5s → samples 20–50
    const trimmed = trimAudio(buf, 0.2, 0.5);
    expect(trimmed.length).toBe(30);
    expect(trimmed.sampleRate).toBe(100);
    expect(trimmed.numberOfChannels).toBe(1);

    const out = trimmed.getChannelData(0);
    expect(out[0]).toBeCloseTo(0.2, 4);
    expect(out[29]).toBeCloseTo(0.49, 4);
  });

  it('preserves all channels independently', () => {
    const left  = Float32Array.from({ length: 100 }, (_, i) => i);
    const right = Float32Array.from({ length: 100 }, (_, i) => -i);
    const buf = createMockAudioBuffer({
      numberOfChannels: 2,
      length: 100,
      sampleRate: 100,
      channelData: [left, right],
    });

    const trimmed = trimAudio(buf, 0.1, 0.4);
    expect(trimmed.numberOfChannels).toBe(2);

    const outL = trimmed.getChannelData(0);
    const outR = trimmed.getChannelData(1);
    expect(outL[0]).toBe(10);
    expect(outR[0]).toBe(-10);
  });

  it('clamps start to 0 when negative', () => {
    const data = new Float32Array(100);
    const buf = createMockAudioBuffer({
      length: 100,
      sampleRate: 100,
      channelData: [data],
    });

    const trimmed = trimAudio(buf, -1, 0.5);
    expect(trimmed.length).toBe(50);
  });

  it('clamps end to buffer length', () => {
    const data = new Float32Array(100);
    const buf = createMockAudioBuffer({
      length: 100,
      sampleRate: 100,
      channelData: [data],
    });

    const trimmed = trimAudio(buf, 0.5, 999);
    expect(trimmed.length).toBe(50);
  });

  it('throws when endTime <= startTime', () => {
    const data = new Float32Array(100);
    const buf = createMockAudioBuffer({
      length: 100,
      sampleRate: 100,
      channelData: [data],
    });

    expect(() => trimAudio(buf, 0.5, 0.5)).toThrow('Invalid trim range');
    expect(() => trimAudio(buf, 0.6, 0.3)).toThrow('Invalid trim range');
  });

  it('handles full-duration trim (no-op equivalent)', () => {
    const data = Float32Array.from({ length: 50 }, (_, i) => i);
    const buf = createMockAudioBuffer({
      length: 50,
      sampleRate: 50,
      channelData: [data],
    });

    const trimmed = trimAudio(buf, 0, 1);
    expect(trimmed.length).toBe(50);
  });
});
