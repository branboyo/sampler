import { useState, useCallback } from 'react';
import type { EditorState } from '@/types';
import { decodeAudioBlob } from '@/lib/audio-engine';

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

  const setPlaying = useCallback((playing: boolean) => {
    setState((prev) => ({ ...prev, isPlaying: playing }));
  }, []);

  const loadFromBlob = useCallback(async (blob: Blob, sampleRate = 44100) => {
    setState((prev) => ({ ...prev, isProcessing: true, isPlaying: false }));
    try {
      const audioBuffer = await decodeAudioBlob(blob, sampleRate);
      setState({
        recordingId: null,
        audioBuffer,
        trimStart: 0,
        trimEnd: audioBuffer.duration,
        isPlaying: false,
        isProcessing: false,
      });
      return audioBuffer;
    } catch (err) {
      console.error('[Sampler] Failed to decode audio:', err);
      setState((prev) => ({ ...prev, isProcessing: false }));
      return null;
    }
  }, []);

  const setTrimStart = useCallback((time: number) => {
    setState((prev) => ({ ...prev, trimStart: Math.max(0, Math.min(time, prev.trimEnd - 0.01)) }));
  }, []);

  const setTrimEnd = useCallback((time: number) => {
    setState((prev) => ({
      ...prev,
      trimEnd: Math.max(time, prev.trimStart + 0.01),
    }));
  }, []);

  const play = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // Replace the current buffer with an already-processed AudioBuffer (e.g. after
  // the user clicks "Apply Trim" in the waveform editor). Trim handles reset to
  // cover the full new duration.
  const replaceBuffer = useCallback((newBuffer: AudioBuffer) => {
    setState((prev) => ({
      recordingId: prev.recordingId,
      audioBuffer: newBuffer,
      trimStart: 0,
      trimEnd: newBuffer.duration,
      isPlaying: false,
      isProcessing: false,
    }));
  }, []);

  return {
    state,
    loadFromBlob,
    setTrimStart,
    setTrimEnd,
    replaceBuffer,
    play,
    pause,
    reset,
    setPlaying,
  };
}
