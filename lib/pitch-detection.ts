const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface PitchResult {
  frequency: number;
  note: string;
  octave: number;
  cents: number;
  confidence: number;
}

export interface PitchFrame {
  time: number;
  pitch: PitchResult | null;
}

export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  threshold = 0.15,
): { frequency: number; confidence: number } | null {
  const bufferSize = samples.length;
  const halfSize = Math.floor(bufferSize / 2);

  const minLag = Math.floor(sampleRate / 2000);
  const maxLag = Math.min(halfSize, Math.floor(sampleRate / 60));
  if (maxLag <= minLag) return null;

  // YIN step 1+2: difference function + cumulative mean normalized difference
  const yinBuffer = new Float32Array(maxLag + 1);
  yinBuffer[0] = 1;
  let runningSum = 0;

  for (let tau = 1; tau <= maxLag; tau++) {
    let diff = 0;
    for (let j = 0; j < halfSize; j++) {
      const d = samples[j] - samples[j + tau];
      diff += d * d;
    }
    yinBuffer[tau] = diff;
    runningSum += diff;
    yinBuffer[tau] = runningSum > 0 ? (yinBuffer[tau] * tau) / runningSum : 1;
  }

  // Step 3: absolute threshold — find first dip below threshold
  let tau = minLag;
  while (tau <= maxLag) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 <= maxLag && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      break;
    }
    tau++;
  }
  if (tau > maxLag) return null;

  // Step 4: parabolic interpolation
  let betterTau = tau;
  if (tau > 0 && tau < maxLag) {
    const s0 = yinBuffer[tau - 1];
    const s1 = yinBuffer[tau];
    const s2 = yinBuffer[tau + 1];
    const denom = 2 * (s0 - 2 * s1 + s2);
    if (denom !== 0) {
      betterTau = tau + (s0 - s2) / denom;
    }
  }

  const confidence = 1 - yinBuffer[tau];
  const frequency = sampleRate / betterTau;

  if (frequency < 50 || frequency > 5000) return null;
  return { frequency, confidence };
}

export function frequencyToNote(frequency: number): {
  note: string;
  octave: number;
  cents: number;
} {
  const noteNum = 12 * Math.log2(frequency / 440) + 69;
  const roundedNote = Math.round(noteNum);
  const cents = Math.round((noteNum - roundedNote) * 100);
  const octave = Math.floor(roundedNote / 12) - 1;
  const noteIndex = ((roundedNote % 12) + 12) % 12;
  return { note: NOTE_NAMES[noteIndex], octave, cents };
}

export function analyzeBuffer(
  audioBuffer: AudioBuffer,
  hopSizeSec = 0.04,
  windowSize = 2048,
): PitchFrame[] {
  const sampleRate = audioBuffer.sampleRate;
  const hopSamples = Math.round(hopSizeSec * sampleRate);
  const channel = audioBuffer.getChannelData(0);
  const frames: PitchFrame[] = [];

  for (let offset = 0; offset + windowSize < channel.length; offset += hopSamples) {
    const time = offset / sampleRate;
    const window = channel.subarray(offset, offset + windowSize);

    let rms = 0;
    for (let i = 0; i < window.length; i++) rms += window[i] * window[i];
    rms = Math.sqrt(rms / window.length);

    if (rms < 0.01) {
      frames.push({ time, pitch: null });
      continue;
    }

    const result = detectPitch(window, sampleRate);
    if (result && result.confidence > 0.7) {
      const { note, octave, cents } = frequencyToNote(result.frequency);
      frames.push({
        time,
        pitch: {
          frequency: result.frequency,
          note,
          octave,
          cents,
          confidence: result.confidence,
        },
      });
    } else {
      frames.push({ time, pitch: null });
    }
  }

  return frames;
}

export function getPitchAtTime(
  frames: PitchFrame[],
  time: number,
  windowSec = 0.12,
): PitchResult | null {
  if (frames.length === 0) return null;

  // Find first frame at or after window start
  const wStart = time - windowSec;
  const wEnd = time + windowSec;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].time < wStart) lo = mid + 1;
    else hi = mid;
  }

  // Count note occurrences in the window, track the frame closest to cursor per note
  const counts = new Map<string, { count: number; pitch: PitchResult; dist: number }>();
  for (let i = lo; i < frames.length && frames[i].time <= wEnd; i++) {
    const p = frames[i].pitch;
    if (!p) continue;
    const key = `${p.note}${p.octave}`;
    const dist = Math.abs(frames[i].time - time);
    const entry = counts.get(key);
    if (entry) {
      entry.count++;
      if (dist < entry.dist) { entry.pitch = p; entry.dist = dist; }
    } else {
      counts.set(key, { count: 1, pitch: p, dist });
    }
  }

  if (counts.size === 0) return null;

  let best: { count: number; pitch: PitchResult } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best?.pitch ?? null;
}
