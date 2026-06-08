import { useState, useEffect, useRef } from 'react';
import type { PitchResult } from '@/lib/pitch-detection';
import { detectPitch, frequencyToNote } from '@/lib/pitch-detection';

/**
 * Real-time pitch detection from a live AnalyserNode.
 * Reads time-domain samples each animation frame, runs YIN,
 * and returns the detected pitch (throttled to ~25 fps).
 */
export function useLivePitch(analyserNode: AnalyserNode | null) {
  const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    if (!analyserNode) {
      setCurrentPitch(null);
      return;
    }

    // Allocate the sample buffer once (fftSize samples)
    const size = analyserNode.fftSize;
    bufferRef.current = new Float32Array(size);
    const sampleRate = analyserNode.context.sampleRate;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      // Throttle to ~25 fps (40ms)
      const now = performance.now();
      if (now - lastUpdateRef.current < 40) return;
      lastUpdateRef.current = now;

      const samples = bufferRef.current!;
      analyserNode.getFloatTimeDomainData(samples);

      // Check RMS — skip silent frames
      let rms = 0;
      for (let i = 0; i < samples.length; i++) rms += samples[i] * samples[i];
      rms = Math.sqrt(rms / samples.length);
      if (rms < 0.01) {
        setCurrentPitch(null);
        return;
      }

      const result = detectPitch(samples, sampleRate);
      if (result && result.confidence > 0.7) {
        const { note, octave, cents } = frequencyToNote(result.frequency);
        setCurrentPitch({
          frequency: result.frequency,
          note,
          octave,
          cents,
          confidence: result.confidence,
        });
      } else {
        setCurrentPitch(null);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setCurrentPitch(null);
    };
  }, [analyserNode]);

  return currentPitch;
}
