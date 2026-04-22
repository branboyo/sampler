import { useState } from 'react';
import type { EditorState } from '@/types';
import { applyPitchShift } from '@/lib/pitch-shift';

const INITIAL_STATE: EditorState = {
  recordingId: null,
  audioBuffer: null,
  trimStart: 0,
  trimEnd: 0,
  isPlaying: false,
  isProcessing: false,
};

export function useAudioEditor() {
  const [state, setState] = useState<EditorState>(INITIAL_STATE);

  const loadRecording = async (_id: string) => {};
  const setTrimStart = (_time: number) => {};
  const setTrimEnd = (_time: number) => {};
  const applyEffect = async (_effectId: string) => {};
  const play = () => {};
  const pause = () => {};

  const applyPitchShiftEffect = async (
    semitones: number,
    cents: number,
    preserveFormants: boolean,
  ): Promise<void> => {
    let currentBuffer: AudioBuffer | null = null;
    setState((s) => {
      currentBuffer = s.audioBuffer;
      return { ...s, isProcessing: true };
    });
    if (!currentBuffer) return;
    try {
      const result = await applyPitchShift(
        currentBuffer,
        semitones,
        cents,
        preserveFormants,
      );
      setState((s) => ({ ...s, audioBuffer: result, isProcessing: false }));
    } catch (err) {
      console.error('Pitch shift failed:', err);
      setState((s) => ({ ...s, isProcessing: false }));
    }
  };

  return {
    state,
    loadRecording,
    setTrimStart,
    setTrimEnd,
    applyEffect,
    play,
    pause,
    applyPitchShiftEffect,
  };
}
