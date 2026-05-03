import { describe, it, expect } from 'vitest';
import { FX_DEFAULTS, FX_LABELS, applyFxChain } from './fx-chain';
import type { FxType, FxChainItem, DelayParams, ReverbParams, DistortionParams, EqParams, PitchParams } from '@/types';
import { createMockAudioBuffer } from '@/tests/helpers/audio-buffer';

const ALL_FX_TYPES: FxType[] = ['delay', 'reverb', 'distortion', 'eq', 'reverse', 'pitch'];

describe('FX_DEFAULTS', () => {
  it('has a default entry for every FxType', () => {
    for (const type of ALL_FX_TYPES) {
      expect(FX_DEFAULTS[type]).toBeDefined();
    }
  });

  it('delay defaults have required fields in valid ranges', () => {
    const d = FX_DEFAULTS.delay as DelayParams;
    expect(d.time).toBeGreaterThanOrEqual(10);
    expect(d.time).toBeLessThanOrEqual(1000);
    expect(d.feedback).toBeGreaterThanOrEqual(0);
    expect(d.feedback).toBeLessThanOrEqual(100);
    expect(d.mix).toBeGreaterThanOrEqual(0);
    expect(d.mix).toBeLessThanOrEqual(100);
  });

  it('reverb defaults have required fields in valid ranges', () => {
    const r = FX_DEFAULTS.reverb as ReverbParams;
    expect(r.roomSize).toBeGreaterThanOrEqual(0);
    expect(r.roomSize).toBeLessThanOrEqual(100);
    expect(r.decay).toBeGreaterThanOrEqual(0);
    expect(r.decay).toBeLessThanOrEqual(100);
    expect(r.mix).toBeGreaterThanOrEqual(0);
    expect(r.mix).toBeLessThanOrEqual(100);
  });

  it('distortion defaults have required fields in valid ranges', () => {
    const d = FX_DEFAULTS.distortion as DistortionParams;
    expect(d.drive).toBeGreaterThanOrEqual(0);
    expect(d.drive).toBeLessThanOrEqual(100);
    expect(d.tone).toBeGreaterThanOrEqual(-12);
    expect(d.tone).toBeLessThanOrEqual(12);
    expect(d.mix).toBeGreaterThanOrEqual(0);
    expect(d.mix).toBeLessThanOrEqual(100);
  });

  it('EQ defaults have required fields in valid ranges', () => {
    const e = FX_DEFAULTS.eq as EqParams;
    expect(e.low).toBeGreaterThanOrEqual(-12);
    expect(e.low).toBeLessThanOrEqual(12);
    expect(e.mid).toBeGreaterThanOrEqual(-12);
    expect(e.mid).toBeLessThanOrEqual(12);
    expect(e.high).toBeGreaterThanOrEqual(-12);
    expect(e.high).toBeLessThanOrEqual(12);
  });

  it('pitch defaults have required fields', () => {
    const p = FX_DEFAULTS.pitch as PitchParams;
    expect(p.semitones).toBe(0);
    expect(p.cents).toBe(0);
    expect(p.preserveFormants).toBe(false);
  });

  it('reverse defaults to empty object', () => {
    expect(FX_DEFAULTS.reverse).toEqual({});
  });
});

describe('FX_LABELS', () => {
  it('has a non-empty label for every FxType', () => {
    for (const type of ALL_FX_TYPES) {
      expect(typeof FX_LABELS[type]).toBe('string');
      expect(FX_LABELS[type].length).toBeGreaterThan(0);
    }
  });
});

describe('applyFxChain', () => {
  it('returns original buffer when chain is empty', async () => {
    const buf = createMockAudioBuffer({ length: 100, sampleRate: 44100 });
    const result = await applyFxChain(buf, []);
    expect(result).toBe(buf);
  });

  it('skips disabled items and returns original buffer', async () => {
    const buf = createMockAudioBuffer({ length: 100, sampleRate: 44100 });
    const chain: FxChainItem[] = [
      {
        id: 'test-1',
        type: 'delay',
        enabled: false,
        params: FX_DEFAULTS.delay,
      },
      {
        id: 'test-2',
        type: 'reverb',
        enabled: false,
        params: FX_DEFAULTS.reverb,
      },
    ];
    const result = await applyFxChain(buf, chain);
    expect(result).toBe(buf);
  });
});
