import { useState, useRef, useCallback, useEffect } from 'react';
import type { RecordingState, ExtensionMessage } from '@/types';
import { PORT_NAME } from '@/lib/messaging';
import { startMediaStream, createRecorder, collectChunks, stopRecorder } from '@/lib/recorder';

const MAX_DURATION = 300; // 5 minutes, not configurable

const INITIAL_STATE: RecordingState = {
  status: 'idle',
  elapsed: 0,
  maxDuration: MAX_DURATION,
  streamId: null,
};

export function useRecorder() {
  const [state, setState] = useState<RecordingState>(INITIAL_STATE);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const blobPromiseRef = useRef<Promise<Blob> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      console.log('[Flih] startRecording called, connecting to background...');
      // Connect to background and request tab capture
      const port = browser.runtime.connect({ name: PORT_NAME });

      const streamId = await new Promise<string>((resolve, reject) => {
        port.onMessage.addListener((msg: ExtensionMessage) => {
          console.log('[Flih] Received message from background:', msg);
          if (msg.type === 'CAPTURE_STARTED') {
            resolve(msg.payload?.streamId as string);
          } else if (msg.type === 'CAPTURE_ERROR') {
            reject(new Error(msg.payload?.error as string));
          }
        });
        port.postMessage({ type: 'START_CAPTURE' });
        console.log('[Flih] Sent START_CAPTURE to background');
      });

      console.log('[Flih] Got streamId:', streamId);

      // Get the media stream from the stream ID
      const stream = await startMediaStream(streamId);
      console.log('[Flih] Got media stream, tracks:', stream.getTracks().length);

      // Set up AudioContext + AnalyserNode for live waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      // Pass audio through to speakers so the user hears it while recording
      analyser.connect(audioCtx.destination);
      audioCtxRef.current = audioCtx;
      setAnalyserNode(analyser);

      // Create MediaRecorder and start collecting chunks
      const recorder = createRecorder(stream);
      recorderRef.current = recorder;
      blobPromiseRef.current = collectChunks(recorder);

      // Start timer
      startTimeRef.current = Date.now();
      setState({
        status: 'recording',
        elapsed: 0,
        maxDuration: MAX_DURATION,
        streamId,
      });

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setState((prev) => {
          if (elapsed >= prev.maxDuration) {
            // Auto-stop at max duration — handled in App via effect
            return { ...prev, elapsed: prev.maxDuration, status: 'stopping' };
          }
          return { ...prev, elapsed };
        });
      }, 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Flih] Recording failed:', message);
      setError(message);
      setState(INITIAL_STATE);
      throw err; // Re-throw so App.tsx can catch it
    }
  }, [clearTimer]);

  const stopRecording = useCallback(async () => {
    clearTimer();
    setState((prev) => ({ ...prev, status: 'stopping' }));

    if (recorderRef.current) {
      stopRecorder(recorderRef.current);
      const blob = await blobPromiseRef.current;
      if (blob) setAudioBlob(blob);
      recorderRef.current = null;
      blobPromiseRef.current = null;
    }

    if (audioCtxRef.current) {
      await audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    setAnalyserNode(null);
    setState(INITIAL_STATE);
  }, [clearTimer]);

  return { state, startRecording, stopRecording, audioBlob, analyserNode, error };
}
