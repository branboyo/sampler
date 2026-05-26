# QA Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a comprehensive unit test suite for the Sampler Chrome extension so that future changes can be validated automatically.

**Architecture:** The project currently has 1 test file (`lib/pitch-shift.test.ts`, 6 tests). This plan adds a `vitest.config.ts` with path aliases, a shared test helper for mocking `AudioBuffer` and Chrome extension APIs (`browser.*`), and test files co-located alongside each source module in `lib/`. Pure logic and data-structure tests are prioritized — functions requiring full `OfflineAudioContext` rendering (FX chain audio processing) are out of scope for unit tests and should be covered by E2E tests later.

**Tech Stack:** Vitest 4.1, TypeScript, `happy-dom` (for minimal DOM/Web API surface)

---

## File Structure

```
chromewave/
├── vitest.config.ts                  # NEW — vitest config with path aliases + happy-dom
├── tests/
│   └── helpers/
│       ├── audio-buffer.ts           # NEW — lightweight AudioBuffer mock
│       └── chrome-api.ts             # NEW — browser.storage / browser.downloads stubs
├── lib/
│   ├── encoder.test.ts               # NEW — WAV encoding tests
│   ├── audio-engine.test.ts          # NEW — trimAudio / reverseAudio tests
│   ├── fx-chain.test.ts              # NEW — FX defaults, distortion curve, silent-tail trimmer
│   ├── storage.test.ts               # NEW — settings CRUD, recording metadata CRUD
│   ├── recorder.test.ts              # NEW — MediaRecorder wrapper tests
│   ├── downloader.test.ts            # NEW — downloadAudio tests
│   └── pitch-shift.test.ts           # EXISTS — already has 6 passing tests
```

---

### Task 1: Test Infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/helpers/audio-buffer.ts`
- Create: `tests/helpers/chrome-api.ts`
- Modify: `package.json` (add `happy-dom` dev dependency)

This task sets up the vitest config, path aliases, and shared mocks that every subsequent task depends on.

- [ ] **Step 1: Install `happy-dom`**

Run:
```bash
npm install -D happy-dom
```

Expected: package.json devDependencies now includes `happy-dom`.

- [ ] **Step 2: Create `vitest.config.ts`**

Create file `vitest.config.ts` at the project root:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '~': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.output', '.wxt', '.claude'],
  },
});
```

Notes for the implementer:
- The `@` alias must point to the project root (`.`), matching the WXT-generated tsconfig paths.
- `exclude` keeps worktree copies and build output out of the test run.
- `happy-dom` gives us `Blob`, `FileReader`, `DataView`, and other Web APIs that Node lacks.

- [ ] **Step 3: Create AudioBuffer mock helper**

Create file `tests/helpers/audio-buffer.ts`:

```ts
export function createMockAudioBuffer(options: {
  numberOfChannels?: number;
  length: number;
  sampleRate?: number;
  channelData?: Float32Array[];
}): AudioBuffer {
  const {
    numberOfChannels = 1,
    length,
    sampleRate = 44100,
    channelData,
  } = options;

  const channels: Float32Array[] = channelData
    ? channelData.map((ch) => ch.slice())
    : Array.from({ length: numberOfChannels }, () => new Float32Array(length));

  return {
    numberOfChannels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData(ch: number): Float32Array {
      if (ch < 0 || ch >= numberOfChannels) {
        throw new RangeError(`channel index ${ch} out of range`);
      }
      return channels[ch];
    },
    copyToChannel(source: Float32Array, ch: number, startInChannel = 0): void {
      channels[ch].set(source, startInChannel);
    },
    copyFromChannel(dest: Float32Array, ch: number, startInChannel = 0): void {
      dest.set(channels[ch].subarray(startInChannel, startInChannel + dest.length));
    },
  } as unknown as AudioBuffer;
}
```

- [ ] **Step 4: Create Chrome API mock helper**

Create file `tests/helpers/chrome-api.ts`:

```ts
import { vi } from 'vitest';

interface StorageArea {
  data: Record<string, unknown>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
}

export function createMockStorage(): StorageArea {
  const data: Record<string, unknown> = {};

  return {
    data,
    get: vi.fn(async (keys: string | string[] | null) => {
      if (keys === null) return { ...data };
      const keyList = typeof keys === 'string' ? [keys] : keys;
      const result: Record<string, unknown> = {};
      for (const k of keyList) {
        if (k in data) result[k] = data[k];
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(data, items);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const keyList = typeof keys === 'string' ? [keys] : keys;
      for (const k of keyList) delete data[k];
    }),
  };
}

export function createMockDownloads() {
  return {
    download: vi.fn(async () => 42),
  };
}

export function installBrowserMock() {
  const storage = createMockStorage();
  const downloads = createMockDownloads();

  const mock = {
    storage: { local: storage },
    downloads,
    runtime: {
      connect: vi.fn(() => ({
        name: 'sampler-port',
        postMessage: vi.fn(),
        onMessage: { addListener: vi.fn() },
        onDisconnect: { addListener: vi.fn() },
      })),
    },
  };

  (globalThis as Record<string, unknown>).browser = mock;
  return mock;
}
```

- [ ] **Step 5: Verify existing tests still pass**

Run:
```bash
npx vitest run
```

Expected: `lib/pitch-shift.test.ts` — 6 tests pass. No other test files picked up from `.claude/` worktrees.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts tests/helpers/audio-buffer.ts tests/helpers/chrome-api.ts package.json package-lock.json
git commit -m "test: add vitest config, AudioBuffer mock, and Chrome API mock helpers"
```

---

### Task 2: WAV Encoder Tests

**Files:**
- Create: `lib/encoder.test.ts`
- Reference (read-only): `lib/encoder.ts`

Tests the WAV encoding pipeline: RIFF header structure, float-to-int16 sample conversion, multi-channel interleaving, format routing, and the MP3 stub.

- [ ] **Step 1: Write the test file**

Create file `lib/encoder.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { encodeWav, encodeMp3, encodeAudio } from './encoder';
import { createMockAudioBuffer } from '@/tests/helpers/audio-buffer';

describe('encodeWav', () => {
  it('produces a Blob with audio/wav MIME type', () => {
    const buf = createMockAudioBuffer({ length: 100, sampleRate: 44100 });
    const blob = encodeWav(buf);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/wav');
  });

  it('writes correct RIFF/WAVE header', async () => {
    const buf = createMockAudioBuffer({
      numberOfChannels: 1,
      length: 10,
      sampleRate: 44100,
    });
    const blob = encodeWav(buf);
    const ab = await blob.arrayBuffer();
    const view = new DataView(ab);

    // "RIFF" at offset 0
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');

    // Total size - 8
    const expectedDataSize = 10 * 1 * 2; // samples * channels * bytesPerSample
    expect(view.getUint32(4, true)).toBe(36 + expectedDataSize);

    // "WAVE" at offset 8
    expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE');

    // Audio format = PCM (1) at offset 20
    expect(view.getUint16(20, true)).toBe(1);

    // Num channels at offset 22
    expect(view.getUint16(22, true)).toBe(1);

    // Sample rate at offset 24
    expect(view.getUint32(24, true)).toBe(44100);

    // Bits per sample at offset 34
    expect(view.getUint16(34, true)).toBe(16);
  });

  it('converts float samples to int16 correctly', async () => {
    const samples = new Float32Array([0.0, 1.0, -1.0, 0.5, -0.5]);
    const buf = createMockAudioBuffer({
      numberOfChannels: 1,
      length: 5,
      sampleRate: 44100,
      channelData: [samples],
    });

    const blob = encodeWav(buf);
    const ab = await blob.arrayBuffer();
    const view = new DataView(ab);

    // Data starts at offset 44
    expect(view.getInt16(44, true)).toBe(0);          // 0.0
    expect(view.getInt16(46, true)).toBe(0x7FFF);     // 1.0 -> 32767
    expect(view.getInt16(48, true)).toBe(-0x8000);    // -1.0 -> -32768
    expect(view.getInt16(50, true)).toBeCloseTo(0x7FFF * 0.5, -2); // ~16383
    expect(view.getInt16(52, true)).toBeCloseTo(-0x8000 * 0.5, -2); // ~-16384
  });

  it('interleaves stereo channels', async () => {
    const left  = new Float32Array([1.0, 0.0]);
    const right = new Float32Array([0.0, -1.0]);
    const buf = createMockAudioBuffer({
      numberOfChannels: 2,
      length: 2,
      sampleRate: 44100,
      channelData: [left, right],
    });

    const blob = encodeWav(buf);
    const ab = await blob.arrayBuffer();
    const view = new DataView(ab);

    // Interleaved: L0 R0 L1 R1
    expect(view.getInt16(44, true)).toBe(0x7FFF);  // L0 = 1.0
    expect(view.getInt16(46, true)).toBe(0);        // R0 = 0.0
    expect(view.getInt16(48, true)).toBe(0);        // L1 = 0.0
    expect(view.getInt16(50, true)).toBe(-0x8000);  // R1 = -1.0
  });

  it('calculates correct total file size', async () => {
    const buf = createMockAudioBuffer({
      numberOfChannels: 2,
      length: 100,
      sampleRate: 48000,
    });
    const blob = encodeWav(buf);
    // header(44) + samples(100) * channels(2) * bytesPerSample(2)
    expect(blob.size).toBe(44 + 100 * 2 * 2);
  });
});

describe('encodeMp3', () => {
  it('throws with not-supported error', async () => {
    const buf = createMockAudioBuffer({ length: 10, sampleRate: 44100 });
    await expect(encodeMp3(buf)).rejects.toThrow('MP3 encoding not yet supported');
  });
});

describe('encodeAudio', () => {
  it('routes wav format to encodeWav', async () => {
    const buf = createMockAudioBuffer({ length: 10, sampleRate: 44100 });
    const blob = await encodeAudio(buf, 'wav');
    expect(blob.type).toBe('audio/wav');
  });

  it('routes mp3 format to encodeMp3 (throws)', async () => {
    const buf = createMockAudioBuffer({ length: 10, sampleRate: 44100 });
    await expect(encodeAudio(buf, 'mp3')).rejects.toThrow('MP3 encoding not yet supported');
  });
});
```

- [ ] **Step 2: Run the tests**

Run:
```bash
npx vitest run lib/encoder.test.ts
```

Expected: All 7 tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/encoder.test.ts
git commit -m "test: add WAV encoder unit tests"
```

---

### Task 3: Audio Engine Tests

**Files:**
- Create: `lib/audio-engine.test.ts`
- Reference (read-only): `lib/audio-engine.ts`

Tests `trimAudio` — the core editing operation. `reverseAudio` and `decodeAudioBlob` depend on `OfflineAudioContext`/`AudioContext` which `happy-dom` does not provide, so they are out of scope for unit tests.

- [ ] **Step 1: Write the test file**

Create file `lib/audio-engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { trimAudio } from './audio-engine';
import { createMockAudioBuffer } from '@/tests/helpers/audio-buffer';

describe('trimAudio', () => {
  it('trims a mono buffer to the specified time range', () => {
    // 1 second of audio at 100 Hz sample rate (100 samples)
    const data = Float32Array.from({ length: 100 }, (_, i) => i / 100);
    const buf = createMockAudioBuffer({
      numberOfChannels: 1,
      length: 100,
      sampleRate: 100,
      channelData: [data],
    });

    // Trim to 0.2s – 0.5s → samples 20–50
    const trimmed = trimAudio(buf, 0.2, 0.5);
    expect(trimmed.length).toBe(30);
    expect(trimmed.sampleRate).toBe(100);
    expect(trimmed.numberOfChannels).toBe(1);

    const out = trimmed.getChannelData(0);
    expect(out[0]).toBeCloseTo(0.2, 4);
    expect(out[29]).toBeCloseTo(0.49, 4);
  });

  it('preserves all channels independently', () => {
    const left  = Float32Array.from({ length: 100 }, (_, i) => i);
    const right = Float32Array.from({ length: 100 }, (_, i) => -i);
    const buf = createMockAudioBuffer({
      numberOfChannels: 2,
      length: 100,
      sampleRate: 100,
      channelData: [left, right],
    });

    const trimmed = trimAudio(buf, 0.1, 0.4);
    expect(trimmed.numberOfChannels).toBe(2);

    const outL = trimmed.getChannelData(0);
    const outR = trimmed.getChannelData(1);
    expect(outL[0]).toBe(10);
    expect(outR[0]).toBe(-10);
  });

  it('clamps start to 0 when negative', () => {
    const data = new Float32Array(100);
    const buf = createMockAudioBuffer({
      length: 100,
      sampleRate: 100,
      channelData: [data],
    });

    const trimmed = trimAudio(buf, -1, 0.5);
    expect(trimmed.length).toBe(50);
  });

  it('clamps end to buffer length', () => {
    const data = new Float32Array(100);
    const buf = createMockAudioBuffer({
      length: 100,
      sampleRate: 100,
      channelData: [data],
    });

    const trimmed = trimAudio(buf, 0.5, 999);
    expect(trimmed.length).toBe(50);
  });

  it('throws when endTime <= startTime', () => {
    const data = new Float32Array(100);
    const buf = createMockAudioBuffer({
      length: 100,
      sampleRate: 100,
      channelData: [data],
    });

    expect(() => trimAudio(buf, 0.5, 0.5)).toThrow('Invalid trim range');
    expect(() => trimAudio(buf, 0.6, 0.3)).toThrow('Invalid trim range');
  });

  it('handles full-duration trim (no-op equivalent)', () => {
    const data = Float32Array.from({ length: 50 }, (_, i) => i);
    const buf = createMockAudioBuffer({
      length: 50,
      sampleRate: 50,
      channelData: [data],
    });

    const trimmed = trimAudio(buf, 0, 1);
    expect(trimmed.length).toBe(50);
  });
});
```

- [ ] **Step 2: Run the tests**

Run:
```bash
npx vitest run lib/audio-engine.test.ts
```

Expected: All 6 tests pass.

Note: `trimAudio` uses `new AudioBuffer({...})` internally. If `happy-dom` does not provide `AudioBuffer` as a constructor, this will fail. In that case, you need to add a global `AudioBuffer` polyfill in `vitest.config.ts` setup. Create `tests/helpers/setup.ts`:

```ts
import { createMockAudioBuffer } from './audio-buffer';

if (typeof globalThis.AudioBuffer === 'undefined') {
  (globalThis as Record<string, unknown>).AudioBuffer = class AudioBuffer {
    numberOfChannels: number;
    length: number;
    sampleRate: number;
    duration: number;
    private channels: Float32Array[];

    constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
      this.numberOfChannels = options.numberOfChannels;
      this.length = options.length;
      this.sampleRate = options.sampleRate;
      this.duration = options.length / options.sampleRate;
      this.channels = Array.from(
        { length: options.numberOfChannels },
        () => new Float32Array(options.length),
      );
    }

    getChannelData(ch: number): Float32Array {
      return this.channels[ch];
    }

    copyToChannel(source: Float32Array, ch: number, startInChannel = 0): void {
      this.channels[ch].set(source, startInChannel);
    }

    copyFromChannel(dest: Float32Array, ch: number, startInChannel = 0): void {
      dest.set(this.channels[ch].subarray(startInChannel, startInChannel + dest.length));
    }
  };
}
```

Then update `vitest.config.ts` to include it:

```ts
test: {
  environment: 'happy-dom',
  setupFiles: ['./tests/helpers/setup.ts'],
  include: ['**/*.test.ts'],
  exclude: ['node_modules', '.output', '.wxt', '.claude'],
},
```

- [ ] **Step 3: Commit**

```bash
git add lib/audio-engine.test.ts tests/helpers/setup.ts vitest.config.ts
git commit -m "test: add audio engine trimAudio unit tests"
```

---

### Task 4: FX Chain Data & Utility Tests

**Files:**
- Create: `lib/fx-chain.test.ts`
- Reference (read-only): `lib/fx-chain.ts`, `types/index.ts`

Tests the exported constants and pure helper functions. The audio-processing functions (`applyFxItem`, `applyFxChain`) depend on `OfflineAudioContext` and are out of scope for unit tests — we test the data layer and the `trimSilentTail`-adjacent logic instead.

`makeDistortionCurve` and `trimSilentTail` are private (`function`, not `export`). To test them without exporting, we test their observable effects through `applyFxChain` — but since that needs `OfflineAudioContext`, we instead verify the exported data contracts and leave audio-processing integration tests to E2E.

- [ ] **Step 1: Write the test file**

Create file `lib/fx-chain.test.ts`:

```ts
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
  it('has a label for every FxType', () => {
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
```

- [ ] **Step 2: Run the tests**

Run:
```bash
npx vitest run lib/fx-chain.test.ts
```

Expected: All 9 tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/fx-chain.test.ts
git commit -m "test: add FX chain defaults and data contract tests"
```

---

### Task 5: Storage Tests

**Files:**
- Create: `lib/storage.test.ts`
- Reference (read-only): `lib/storage.ts`, `types/index.ts`

Tests the Chrome Storage wrapper functions (`getSettings`, `saveSettings`, `saveRecordingMeta`, `getRecordingMeta`, `getAllRecordings`, `deleteRecording`) using the `browser.*` mock from Task 1. IndexedDB functions (`saveAudioBlob`, `getAudioBlob`, `deleteAudioBlob`) are tested via `fake-indexeddb`.

- [ ] **Step 1: Install `fake-indexeddb`**

Run:
```bash
npm install -D fake-indexeddb
```

- [ ] **Step 2: Update setup file to include `fake-indexeddb`**

Edit `tests/helpers/setup.ts` — add this import at the top of the file:

```ts
import 'fake-indexeddb/auto';
```

This polyfills `indexedDB` globally so `openDB()` in `storage.ts` works in tests.

- [ ] **Step 3: Write the test file**

Create file `lib/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { installBrowserMock } from '@/tests/helpers/chrome-api';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  saveRecordingMeta,
  getRecordingMeta,
  getAllRecordings,
  deleteRecording,
  saveAudioBlob,
  getAudioBlob,
  deleteAudioBlob,
} from './storage';
import type { RecordingMeta } from '@/types';

describe('settings', () => {
  let mockBrowser: ReturnType<typeof installBrowserMock>;

  beforeEach(() => {
    mockBrowser = installBrowserMock();
  });

  it('returns defaults when no settings are stored', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('merges partial stored settings with defaults', async () => {
    mockBrowser.storage.local.data['settings'] = { folderName: 'Custom' };
    const settings = await getSettings();
    expect(settings.folderName).toBe('Custom');
    expect(settings.preferredFormat).toBe(DEFAULT_SETTINGS.preferredFormat);
    expect(settings.sampleRate).toBe(DEFAULT_SETTINGS.sampleRate);
    expect(settings.waveformZoomMode).toBe(DEFAULT_SETTINGS.waveformZoomMode);
  });

  it('saveSettings persists partial update', async () => {
    await saveSettings({ sampleRate: 48000 });
    const settings = await getSettings();
    expect(settings.sampleRate).toBe(48000);
    expect(settings.folderName).toBe(DEFAULT_SETTINGS.folderName);
  });

  it('saveSettings merges with existing saved settings', async () => {
    await saveSettings({ folderName: 'A' });
    await saveSettings({ sampleRate: 48000 });
    const settings = await getSettings();
    expect(settings.folderName).toBe('A');
    expect(settings.sampleRate).toBe(48000);
  });
});

describe('recording metadata', () => {
  let mockBrowser: ReturnType<typeof installBrowserMock>;

  beforeEach(() => {
    mockBrowser = installBrowserMock();
  });

  const testMeta: RecordingMeta = {
    id: 'rec-1',
    name: 'Test Recording',
    duration: 5.0,
    createdAt: Date.now(),
    sampleRate: 44100,
    channels: 1,
    size: 1024,
  };

  it('saveRecordingMeta and getRecordingMeta round-trip', async () => {
    await saveRecordingMeta(testMeta);
    const result = await getRecordingMeta('rec-1');
    expect(result).toEqual(testMeta);
  });

  it('getRecordingMeta returns null for unknown id', async () => {
    const result = await getRecordingMeta('nonexistent');
    expect(result).toBeNull();
  });

  it('getAllRecordings returns all saved recordings', async () => {
    const meta2 = { ...testMeta, id: 'rec-2', name: 'Second' };
    await saveRecordingMeta(testMeta);
    await saveRecordingMeta(meta2);
    const all = await getAllRecordings();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.id).sort()).toEqual(['rec-1', 'rec-2']);
  });

  it('getAllRecordings ignores non-rec: keys', async () => {
    mockBrowser.storage.local.data['settings'] = { folderName: 'X' };
    await saveRecordingMeta(testMeta);
    const all = await getAllRecordings();
    expect(all).toHaveLength(1);
  });
});

describe('audio blob storage (IndexedDB)', () => {
  it('saveAudioBlob and getAudioBlob round-trip', async () => {
    const blob = new Blob(['test audio data'], { type: 'audio/webm' });
    await saveAudioBlob('blob-1', blob);
    const result = await getAudioBlob('blob-1');
    expect(result).toBeInstanceOf(Blob);
    expect(result!.size).toBe(blob.size);
  });

  it('getAudioBlob returns null for unknown id', async () => {
    const result = await getAudioBlob('nonexistent');
    expect(result).toBeNull();
  });

  it('deleteAudioBlob removes the blob', async () => {
    const blob = new Blob(['data'], { type: 'audio/webm' });
    await saveAudioBlob('blob-del', blob);
    await deleteAudioBlob('blob-del');
    const result = await getAudioBlob('blob-del');
    expect(result).toBeNull();
  });
});

describe('deleteRecording', () => {
  beforeEach(() => {
    installBrowserMock();
  });

  it('removes both metadata and audio blob', async () => {
    const meta: RecordingMeta = {
      id: 'del-1',
      name: 'To Delete',
      duration: 1,
      createdAt: Date.now(),
      sampleRate: 44100,
      channels: 1,
      size: 100,
    };
    await saveRecordingMeta(meta);
    await saveAudioBlob('del-1', new Blob(['audio']));

    await deleteRecording('del-1');

    const metaResult = await getRecordingMeta('del-1');
    expect(metaResult).toBeNull();
    const blobResult = await getAudioBlob('del-1');
    expect(blobResult).toBeNull();
  });
});
```

- [ ] **Step 4: Run the tests**

Run:
```bash
npx vitest run lib/storage.test.ts
```

Expected: All 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.test.ts tests/helpers/setup.ts package.json package-lock.json
git commit -m "test: add storage layer unit tests with IndexedDB and Chrome API mocks"
```

---

### Task 6: Downloader Tests

**Files:**
- Create: `lib/downloader.test.ts`
- Reference (read-only): `lib/downloader.ts`

Tests the `downloadAudio` function, which converts a Blob to a data URL and calls `browser.downloads.download`.

- [ ] **Step 1: Write the test file**

Create file `lib/downloader.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { installBrowserMock } from '@/tests/helpers/chrome-api';
import { downloadAudio } from './downloader';

describe('downloadAudio', () => {
  let mockBrowser: ReturnType<typeof installBrowserMock>;

  beforeEach(() => {
    mockBrowser = installBrowserMock();
  });

  it('calls browser.downloads.download with correct filename path', async () => {
    const blob = new Blob(['test'], { type: 'audio/wav' });
    await downloadAudio(blob, 'my-recording.wav', 'Sampler');

    expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(1);
    const callArgs = mockBrowser.downloads.download.mock.calls[0][0];
    expect(callArgs.filename).toBe('Sampler/my-recording.wav');
    expect(callArgs.saveAs).toBe(false);
  });

  it('passes a data URL (base64)', async () => {
    const blob = new Blob(['hello'], { type: 'audio/wav' });
    await downloadAudio(blob, 'test.wav', 'Folder');

    const callArgs = mockBrowser.downloads.download.mock.calls[0][0];
    expect(callArgs.url).toMatch(/^data:/);
  });

  it('returns the download ID', async () => {
    const blob = new Blob(['data'], { type: 'audio/wav' });
    const id = await downloadAudio(blob, 'file.wav', 'Dir');
    expect(id).toBe(42); // mock returns 42
  });
});
```

- [ ] **Step 2: Run the tests**

Run:
```bash
npx vitest run lib/downloader.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/downloader.test.ts
git commit -m "test: add downloader unit tests"
```

---

### Task 7: Recorder Utility Tests

**Files:**
- Create: `lib/recorder.test.ts`
- Reference (read-only): `lib/recorder.ts`

Tests `stopRecorder` and `collectChunks` using minimal `MediaRecorder` mocks. `startMediaStream` depends on `navigator.mediaDevices.getUserMedia` with Chrome-specific constraints and is not unit-testable.

- [ ] **Step 1: Write the test file**

Create file `lib/recorder.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { stopRecorder, createRecorder, collectChunks } from './recorder';

function createMockMediaStream(): MediaStream {
  const track = {
    stop: vi.fn(),
    kind: 'audio',
    id: 'track-1',
    enabled: true,
    readyState: 'live' as MediaStreamTrackState,
  };
  return {
    getTracks: () => [track],
    getAudioTracks: () => [track],
    getVideoTracks: () => [],
    id: 'stream-1',
    active: true,
  } as unknown as MediaStream;
}

describe('stopRecorder', () => {
  it('calls stop() when recorder is recording', () => {
    const stopFn = vi.fn();
    const stream = createMockMediaStream();
    const recorder = {
      state: 'recording' as RecordingState,
      stop: stopFn,
      stream,
    } as unknown as MediaRecorder;

    stopRecorder(recorder);

    expect(stopFn).toHaveBeenCalledTimes(1);
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('does not call stop() when recorder is already inactive', () => {
    const stopFn = vi.fn();
    const stream = createMockMediaStream();
    const recorder = {
      state: 'inactive' as RecordingState,
      stop: stopFn,
      stream,
    } as unknown as MediaRecorder;

    stopRecorder(recorder);

    expect(stopFn).not.toHaveBeenCalled();
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('stops all stream tracks', () => {
    const track1 = { stop: vi.fn() };
    const track2 = { stop: vi.fn() };
    const stream = {
      getTracks: () => [track1, track2],
    } as unknown as MediaStream;
    const recorder = {
      state: 'inactive' as RecordingState,
      stop: vi.fn(),
      stream,
    } as unknown as MediaRecorder;

    stopRecorder(recorder);

    expect(track1.stop).toHaveBeenCalled();
    expect(track2.stop).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests**

Run:
```bash
npx vitest run lib/recorder.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/recorder.test.ts
git commit -m "test: add recorder utility tests"
```

---

### Task 8: Messaging Tests

**Files:**
- Create: `lib/messaging.test.ts`
- Reference (read-only): `lib/messaging.ts`

Tests the thin messaging wrappers. These are simple pass-through functions, so the tests are intentionally minimal — they verify the contract rather than reimplementing the logic.

- [ ] **Step 1: Write the test file**

Create file `lib/messaging.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installBrowserMock } from '@/tests/helpers/chrome-api';
import { PORT_NAME, connectToBackground, sendMessage, onMessage } from './messaging';

describe('messaging', () => {
  beforeEach(() => {
    installBrowserMock();
  });

  it('PORT_NAME is sampler-port', () => {
    expect(PORT_NAME).toBe('sampler-port');
  });

  it('connectToBackground calls browser.runtime.connect with port name', () => {
    const port = connectToBackground();
    expect((globalThis as any).browser.runtime.connect).toHaveBeenCalledWith({
      name: 'sampler-port',
    });
    expect(port).toBeDefined();
  });

  it('sendMessage calls port.postMessage', () => {
    const port = connectToBackground();
    const msg = { type: 'START_CAPTURE' as const };
    sendMessage(port, msg);
    expect(port.postMessage).toHaveBeenCalledWith(msg);
  });

  it('onMessage registers a listener', () => {
    const port = connectToBackground();
    const handler = vi.fn();
    onMessage(port, handler);
    expect(port.onMessage.addListener).toHaveBeenCalledWith(handler);
  });
});
```

- [ ] **Step 2: Run the tests**

Run:
```bash
npx vitest run lib/messaging.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/messaging.test.ts
git commit -m "test: add messaging layer tests"
```

---

### Task 9: Full Suite Smoke Test

**Files:** None created — verification only.

- [ ] **Step 1: Run the full test suite**

Run:
```bash
npx vitest run
```

Expected output should show all test files passing:
- `lib/pitch-shift.test.ts` — 6 tests
- `lib/encoder.test.ts` — 7 tests
- `lib/audio-engine.test.ts` — 6 tests
- `lib/fx-chain.test.ts` — 9 tests
- `lib/storage.test.ts` — 10 tests
- `lib/downloader.test.ts` — 3 tests
- `lib/recorder.test.ts` — 3 tests
- `lib/messaging.test.ts` — 4 tests

Total: **48 tests** across 8 files (up from 6 tests in 1 file).

- [ ] **Step 2: Run type checking**

Run:
```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Final commit if any fixups were needed**

If any tests needed adjustment during this step, commit the fixes:

```bash
git add -u
git commit -m "test: fix test suite issues from full-run verification"
```

---

## Out of Scope (Future Work)

These areas are intentionally excluded from this plan and should be addressed separately:

1. **FX chain audio-processing tests** — `applyFxItem` for delay/reverb/distortion/EQ/pitch requires `OfflineAudioContext` and a real WASM runtime. These need either a browser-based test runner (Playwright/Puppeteer) or a Node Web Audio polyfill like `web-audio-api`.

2. **React hook tests** — `useRecorder`, `useAudioEditor`, `useFxChain`, `useLibrary`, `useSettings` need `@testing-library/react` with `renderHook` plus all the browser API mocks above. Worth doing once the lib-layer coverage is solid.

3. **React component tests** — `WaveformEditor`, `FxChain`, `RecordingLibrary`, etc. need `@testing-library/react` plus `wavesurfer.js` mocking. These are better served by E2E tests with Puppeteer (already a devDependency).

4. **E2E / integration tests** — Load the extension in a real browser via Puppeteer, record a tab, apply effects, export. This is the most valuable long-term investment but requires significant infrastructure (test audio sources, extension loading harness).
