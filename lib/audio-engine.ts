import type { AudioEffect } from '@/types';

export async function decodeAudioBlob(
  blob: Blob,
  sampleRate = 44100,
): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioContext({ sampleRate });
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    await ctx.close();
  }
}

export function trimAudio(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number,
): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  // Round to nearest sample for sub-millisecond accuracy; clamp to buffer bounds
  const startSample = Math.max(0, Math.round(startTime * sampleRate));
  const endSample = Math.min(buffer.length, Math.round(endTime * sampleRate));
  const trimmedLength = endSample - startSample;

  if (trimmedLength <= 0) {
    throw new Error('Invalid trim range: endTime must be greater than startTime');
  }

  // AudioBuffer constructor avoids OfflineAudioContext overhead and
  // correctly preserves each channel independently (no mono summation bug).
  const trimmed = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length: trimmedLength,
    sampleRate,
  });

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    trimmed.getChannelData(ch).set(
      buffer.getChannelData(ch).subarray(startSample, endSample),
    );
  }

  return trimmed;
}

export async function reverseAudio(buffer: AudioBuffer): Promise<AudioBuffer> {
  const { numberOfChannels, length, sampleRate } = buffer;
  const offlineCtx = new OfflineAudioContext(numberOfChannels, length, sampleRate);
  const reversed = offlineCtx.createBuffer(numberOfChannels, length, sampleRate);

  for (let ch = 0; ch < numberOfChannels; ch++) {
    const source = buffer.getChannelData(ch);
    const dest = reversed.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      dest[i] = source[length - 1 - i];
    }
  }

  const src = offlineCtx.createBufferSource();
  src.buffer = reversed;
  src.connect(offlineCtx.destination);
  src.start(0);

  return offlineCtx.startRendering();
}

export const effects: AudioEffect[] = [
  {
    id: 'trim',
    label: 'Trim',
    icon: '✂',
    apply: async (buffer, _ctx) => Promise.resolve(trimAudio(buffer, 0, buffer.duration)),
  },
  {
    id: 'reverse',
    label: 'Reverse',
    icon: '↔',
    apply: async (buffer, _ctx) => reverseAudio(buffer),
  },
  {
    id: 'pitch',
    label: 'Pitch',
    icon: '♪',
    panel: true,
    apply: async (buffer, _ctx) => buffer, // no-op: PitchShiftControls calls applyPitchShift directly
  },
];
