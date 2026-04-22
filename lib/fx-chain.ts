import type { FxChainItem, FxType, DelayParams, ReverbParams, DistortionParams, EqParams, PitchParams } from '@/types';
import { applyPitchShift } from './pitch-shift';

// Default params for each FX type
export const FX_DEFAULTS: Record<FxType, FxChainItem['params']> = {
  delay: { time: 300, feedback: 30, mix: 40 } satisfies DelayParams,
  reverb: { roomSize: 50, decay: 50, mix: 40 } satisfies ReverbParams,
  distortion: { drive: 50, tone: 0, mix: 100 } satisfies DistortionParams,
  eq: { low: 0, mid: 0, high: 0 } satisfies EqParams,
  reverse: {},
  pitch: { semitones: 0, cents: 0, preserveFormants: false } satisfies PitchParams,
};

export const FX_LABELS: Record<FxType, string> = {
  delay: 'Delay',
  reverb: 'Reverb',
  distortion: 'Distortion',
  eq: 'EQ',
  reverse: 'Reverse',
  pitch: 'Pitch Shift',
};

// Generate a synthetic reverb impulse response (exponential decay noise)
function buildReverbIR(ctx: OfflineAudioContext, durationSec: number, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const ir = ctx.createBuffer(2, length, sampleRate);
  const decayFactor = Math.max(0.01, decay / 100);

  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * (10 / (decayFactor * durationSec)));
    }
  }
  return ir;
}

// Make a distortion curve for WaveShaperNode.
//
// Uses tanh saturation with an exponential pre-gain baked into the lookup:
//   drive   0 → gain ≈   1× — barely any harmonic saturation
//   drive  50 → gain ≈  14× — moderate clipping, warm second/third harmonics
//   drive 100 → gain ≈ 200× — near-hard-clip / fuzz character
//
// tanh is the conventional analog model for transistor/tube saturation.
// The pre-gain is baked into the curve rather than a separate GainNode so
// that the WaveShaperNode's built-in 4× oversampling applies to the full
// nonlinearity (it only oversamples the waveshaper stage, not a preceding node).
function makeDistortionCurve(drive: number): Float32Array {
  const n = 512; // higher resolution → smoother interpolation at gentle saturation
  const curve = new Float32Array(n);
  const gain = Math.pow(200, drive / 100); // exponential: perceptually uniform steps
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1; // -1 … +1 (WaveShaperNode input range)
    curve[i] = Math.tanh(x * gain);
  }
  return curve;
}

// Trim inaudible silence from the end of a buffer.
// Delay echoes and reverb tails decay exponentially and produce long stretches
// of near-zero samples. We scan from the end to find the last sample above
// threshold, then keep only up to that point + a short pad.
function trimSilentTail(
  buffer: AudioBuffer,
  threshold = 0.0005, // ≈ -66 dBFS — quiet enough to capture fading tails
  paddingSec = 0.1,   // keep 100 ms after last audible sample
): AudioBuffer {
  const { numberOfChannels, sampleRate, length } = buffer;
  let lastAudible = 0;

  for (let ch = 0; ch < numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = length - 1; i > lastAudible; i--) {
      if (Math.abs(data[i]) > threshold) {
        lastAudible = i;
        break;
      }
    }
  }

  const paddingSamples = Math.ceil(paddingSec * sampleRate);
  const newLength = Math.min(length, lastAudible + paddingSamples + 1);

  // Skip the copy if we're barely trimming (< 1%) — not worth the allocation
  if (newLength >= length * 0.99) return buffer;

  const out = new AudioBuffer({ length: newLength, numberOfChannels, sampleRate });
  for (let ch = 0; ch < numberOfChannels; ch++) {
    out.copyToChannel(buffer.getChannelData(ch).subarray(0, newLength), ch);
  }
  return out;
}

// Apply a single FX item to an AudioBuffer using OfflineAudioContext
async function applyFxItem(buffer: AudioBuffer, item: FxChainItem): Promise<AudioBuffer> {
  const { type, params } = item;
  const { numberOfChannels, sampleRate } = buffer;

  if (type === 'reverse') {
    const reversed = new OfflineAudioContext(numberOfChannels, buffer.length, sampleRate);
    const rb = reversed.createBuffer(numberOfChannels, buffer.length, sampleRate);
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = rb.getChannelData(ch);
      for (let i = 0; i < buffer.length; i++) dst[i] = src[buffer.length - 1 - i];
    }
    const srcNode = reversed.createBufferSource();
    srcNode.buffer = rb;
    srcNode.connect(reversed.destination);
    srcNode.start(0);
    return reversed.startRendering();
  }

  if (type === 'delay') {
    const p = params as DelayParams;
    const delayTimeSec = p.time / 1000;
    const feedback = p.feedback / 100;
    const mix = p.mix / 100;

    // Manual echo unrolling for OfflineAudioContext compatibility
    const maxEchoes = 12;
    const outputLength = buffer.length + Math.ceil(delayTimeSec * maxEchoes * sampleRate);
    const ctx = new OfflineAudioContext(numberOfChannels, outputLength, sampleRate);

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - mix;
    const wetGain = ctx.createGain();
    wetGain.gain.value = mix;

    const srcDry = ctx.createBufferSource();
    srcDry.buffer = buffer;
    srcDry.connect(dryGain);
    dryGain.connect(ctx.destination);
    srcDry.start(0);

    let echoGain = mix;
    for (let echo = 1; echo <= maxEchoes && echoGain > 0.001; echo++) {
      const echoSrc = ctx.createBufferSource();
      echoSrc.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = echoGain;
      echoSrc.connect(g);
      g.connect(wetGain);
      echoSrc.start(delayTimeSec * echo);
      echoGain *= feedback;
    }

    wetGain.connect(ctx.destination);
    const rendered = await ctx.startRendering();
    return trimSilentTail(rendered);
  }

  if (type === 'reverb') {
    const p = params as ReverbParams;
    const roomSize = p.roomSize / 100;
    const decay = p.decay;
    const mix = p.mix / 100;

    const irDuration = 0.5 + roomSize * 3.5; // 0.5s to 4s
    const outputLength = buffer.length + Math.ceil(irDuration * sampleRate);
    const ctx = new OfflineAudioContext(numberOfChannels, outputLength, sampleRate);

    const ir = buildReverbIR(ctx, irDuration, decay);

    const convolver = ctx.createConvolver();
    convolver.normalize = true;
    convolver.buffer = ir;

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - mix;
    const wetGain = ctx.createGain();
    wetGain.gain.value = mix;

    const srcNode = ctx.createBufferSource();
    srcNode.buffer = buffer;

    srcNode.connect(dryGain);
    dryGain.connect(ctx.destination);

    srcNode.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(ctx.destination);

    srcNode.start(0);
    return trimSilentTail(await ctx.startRendering());
  }

  if (type === 'distortion') {
    const p = params as DistortionParams;
    const drive = p.drive;
    const tone  = p.tone; // dB, -12 to +12 (0 = flat)
    const mix   = p.mix / 100;

    const ctx = new OfflineAudioContext(numberOfChannels, buffer.length, sampleRate);

    const srcNode = ctx.createBufferSource();
    srcNode.buffer = buffer;

    // ── Dry path ────────────────────────────────────────────────────────────
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - mix;

    // ── Wet path ────────────────────────────────────────────────────────────
    // Waveshaper: tanh saturation with baked-in exponential pre-gain.
    // '4x' oversampling reduces aliasing from the high-frequency harmonics
    // generated by hard clipping.
    const waveshaper = ctx.createWaveShaper();
    waveshaper.curve = makeDistortionCurve(drive) as Float32Array<ArrayBuffer>;
    waveshaper.oversample = '4x';

    // Post-clip tone: high-shelf centred at 2 kHz.
    //   tone < 0 → rolls off highs (dark / warm)
    //   tone = 0 → flat
    //   tone > 0 → boosts presence (bright / cutting)
    // This matches the convention of virtually every distortion/overdrive pedal
    // where the tone stack sits after the clipping stage.
    const toneShelf = ctx.createBiquadFilter();
    toneShelf.type = 'highshelf';
    toneShelf.frequency.value = 2000;
    toneShelf.gain.value = tone; // directly in dB

    // Output trim: at high drive the tanh stage saturates near ±1 and the
    // signal becomes perceptually louder.  Scale back to keep the wet path
    // roughly level-matched with the dry path.
    // drive=0 → trim=1.0, drive=100 → trim≈0.5 (exponential taper).
    const trim = Math.pow(0.5, drive / 100);
    const wetGain = ctx.createGain();
    wetGain.gain.value = mix * trim;

    srcNode.connect(dryGain);
    dryGain.connect(ctx.destination);

    srcNode.connect(waveshaper);
    waveshaper.connect(toneShelf);
    toneShelf.connect(wetGain);
    wetGain.connect(ctx.destination);

    srcNode.start(0);
    return ctx.startRendering();
  }

  if (type === 'eq') {
    const p = params as EqParams;
    const ctx = new OfflineAudioContext(numberOfChannels, buffer.length, sampleRate);

    const srcNode = ctx.createBufferSource();
    srcNode.buffer = buffer;

    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 200;
    lowShelf.gain.value = p.low;

    const midPeak = ctx.createBiquadFilter();
    midPeak.type = 'peaking';
    midPeak.frequency.value = 1000;
    midPeak.Q.value = 1;
    midPeak.gain.value = p.mid;

    const highShelf = ctx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 5000;
    highShelf.gain.value = p.high;

    srcNode.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    highShelf.connect(ctx.destination);

    srcNode.start(0);
    return ctx.startRendering();
  }

  if (type === 'pitch') {
    const p = params as PitchParams;
    return applyPitchShift(buffer, p.semitones, p.cents, p.preserveFormants);
  }

  return buffer;
}

// Apply the entire FX chain to a buffer, skipping disabled items
export async function applyFxChain(
  buffer: AudioBuffer,
  chain: FxChainItem[],
): Promise<AudioBuffer> {
  let current = buffer;
  for (const item of chain) {
    if (item.enabled) {
      current = await applyFxItem(current, item);
    }
  }
  return current;
}
