import { useState, useCallback } from 'react';
import type { EditorState } from '@/types';
import { decodeAudioBlob, trimAudio, reverseAudio } from '@/lib/audio-engine';
import { getAudioBlob } from '@/lib/storage';

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
      console.error('[Flih] Failed to decode audio:', err);
      setState((prev) => ({ ...prev, isProcessing: false }));
      return null;
    }
  }, []);

  const loadRecording = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, isProcessing: true, isPlaying: false }));
    try {
      const blob = await getAudioBlob(id);
      if (!blob) {
        console.error('[Flih] No audio blob found for id:', id);
        setState((prev) => ({ ...prev, isProcessing: false }));
        return;
      }
      const audioBuffer = await decodeAudioBlob(blob);
      setState({
        recordingId: id,
        audioBuffer,
        trimStart: 0,
        trimEnd: audioBuffer.duration,
        isPlaying: false,
        isProcessing: false,
      });
    } catch (err) {
      console.error('[Flih] Failed to load recording:', err);
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  }, []);

  const setTrimStart = useCallback((time: number) => {
    setState((prev) => ({ ...prev, trimStart: Math.max(0, Math.min(time, prev.trimEnd - 0.01)) }));
  }, []);

  const setTrimEnd = useCallback((time: number) => {
    setState((prev) => ({
      ...prev,
      trimEnd: Math.min(prev.audioBuffer?.duration ?? time, Math.max(time, prev.trimStart + 0.01)),
    }));
  }, []);

  const applyEffect = useCallback(async (effectId: string) => {
    if (!state.audioBuffer) return;
    setState((prev) => ({ ...prev, isProcessing: true, isPlaying: false }));

    try {
      let newBuffer: AudioBuffer;
      if (effectId === 'trim') {
        newBuffer = await trimAudio(state.audioBuffer, state.trimStart, state.trimEnd);
      } else if (effectId === 'reverse') {
        newBuffer = await reverseAudio(state.audioBuffer);
      } else {
        setState((prev) => ({ ...prev, isProcessing: false }));
        return;
      }
      setState({
        recordingId: state.recordingId,
        audioBuffer: newBuffer,
        trimStart: 0,
        trimEnd: newBuffer.duration,
        isPlaying: false,
        isProcessing: false,
      });
    } catch (err) {
      console.error('[Flih] Effect failed:', err);
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [state.audioBuffer, state.trimStart, state.trimEnd, state.recordingId]);

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
    loadRecording,
    setTrimStart,
    setTrimEnd,
    applyEffect,
    replaceBuffer,
    play,
    pause,
    reset,
    setPlaying,
  };
}
