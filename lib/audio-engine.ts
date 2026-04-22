import type { AudioEffect } from '@/types';

export async function decodeAudioBlob(
  blob: Blob,
  sampleRate = 44100,
): Promise<AudioBuffer> {
  throw new Error('Not implemented');
}

export async function trimAudio(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number,
): Promise<AudioBuffer> {
  throw new Error('Not implemented');
}

export async function reverseAudio(buffer: AudioBuffer): Promise<AudioBuffer> {
  throw new Error('Not implemented');
}

export const effects: AudioEffect[] = [
  {
    id: 'trim',
    label: 'Trim',
    icon: '✂',
    apply: async (buffer, _ctx) => trimAudio(buffer, 0, buffer.duration),
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
