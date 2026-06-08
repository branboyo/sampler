import { useState, useEffect, useCallback, useRef } from 'react';
import type { PitchResult, PitchFrame } from '@/lib/pitch-detection';
import { analyzeBuffer, getPitchAtTime } from '@/lib/pitch-detection';

export function usePitchDetection(audioBuffer: AudioBuffer | null) {
  const [frames, setFrames] = useState<PitchFrame[]>([]);
  const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null);
  const framesRef = useRef<PitchFrame[]>([]);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!audioBuffer) {
      setFrames([]);
      framesRef.current = [];
      setCurrentPitch(null);
      return;
    }
    const result = analyzeBuffer(audioBuffer);
    setFrames(result);
    framesRef.current = result;
  }, [audioBuffer]);

  const updateTime = useCallback((time: number) => {
    const now = performance.now();
    if (now - lastUpdateRef.current < 40) return;
    lastUpdateRef.current = now;
    const pitch = getPitchAtTime(framesRef.current, time);
    if (pitch) setCurrentPitch(pitch);
  }, []);

  const clear = useCallback(() => {
    setCurrentPitch(null);
  }, []);

  const invalidate = useCallback(() => {
    setFrames([]);
    framesRef.current = [];
    setCurrentPitch(null);
  }, []);

  return { frames, currentPitch, updateTime, clear, invalidate };
}
