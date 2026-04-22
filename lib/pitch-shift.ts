import createRubberBand from 'rubberband-wasm';
import type { RBModule } from 'rubberband-wasm';

let rbModulePromise: Promise<RBModule> | null = null;

function getRBModule(): Promise<RBModule> {
  if (!rbModulePromise) {
    rbModulePromise = createRubberBand();
  }
  return rbModulePromise;
}

export function computePitchScale(semitones: number, cents: number): number {
  return Math.pow(2, (semitones + cents / 100) / 12);
}

export async function applyPitchShift(
  buffer: AudioBuffer,
  semitones: number,
  cents: number,
  preserveFormants: boolean,
): Promise<AudioBuffer> {
  if (semitones === 0 && cents === 0) {
    return buffer;
  }

  const RB = await getRBModule();
  const { RubberBandStretcher } = RB;

  const pitchScale = computePitchScale(semitones, cents);
  const { sampleRate, numberOfChannels, length } = buffer;

  let options =
    RubberBandStretcher.OptionProcessOffline |
    RubberBandStretcher.OptionPitchHighQuality;
  if (preserveFormants) {
    options |= RubberBandStretcher.OptionFormantPreserved;
  } else {
    options |= RubberBandStretcher.OptionFormantShifted;
  }

  const stretcher = new RubberBandStretcher(
    sampleRate,
    numberOfChannels,
    options,
    1.0,        // timeRatio = 1.0: pitch-only, no duration change
    pitchScale,
  );

  // Extract all channel data upfront
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numberOfChannels; ch++) {
    channelData.push(buffer.getChannelData(ch).slice());
  }

  // Offline mode requires a study pass before processing
  stretcher.study(channelData, length, true);
  stretcher.process(channelData, length, true);

  // Collect output chunks per channel
  const chunks: Float32Array[][] = Array.from(
    { length: numberOfChannels },
    () => [],
  );
  let totalSamples = 0;

  let available: number;
  while ((available = stretcher.available()) > 0) {
    const chunk = stretcher.retrieve(available);
    for (let ch = 0; ch < numberOfChannels; ch++) {
      chunks[ch].push(chunk[ch].slice()); // slice() copies out of WASM heap
    }
    totalSamples += chunk[0].length;
  }

  stretcher.delete(); // free WASM memory

  if (totalSamples === 0) {
    return buffer;
  }

  // Merge chunks and build output AudioBuffer at actual output length
  const outBuffer = new AudioBuffer({ numberOfChannels, length: totalSamples, sampleRate });
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const c of chunks[ch]) {
      merged.set(c, offset);
      offset += c.length;
    }
    outBuffer.copyToChannel(merged, ch);
  }

  return outBuffer;
}
