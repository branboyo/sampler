# Codebase Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all dead code left behind by the recording library removal and earlier feature iterations, fix stale tests, and clean up unused exports/types.

**Architecture:** Pure deletion and pruning — no new functionality. Each task targets one layer (files → exports → types → tests) so changes are independently verifiable.

**Tech Stack:** TypeScript, React, Vitest

---

## File Map

| Action | File | Reason |
|--------|------|--------|
| Delete | `components/RecordingLibrary.tsx` | Removed from App.tsx earlier this session, no imports |
| Delete | `components/EffectsBar.tsx` | Legacy component, no imports |
| Delete | `components/PitchShiftControls.tsx` | Legacy component, no imports |
| Delete | `hooks/useLibrary.ts` | Removed from App.tsx earlier this session, no imports |
| Delete | `hooks/useLivePitch.ts` | Legacy hook, no imports |
| Modify | `lib/audio-engine.ts` | Remove dead `effects` array and `AudioEffect` import |
| Modify | `hooks/useAudioEditor.ts` | Remove `loadRecording`, `applyEffect`, `getAudioBlob` import |
| Modify | `entrypoints/sidepanel/App.tsx` | Remove `saveAudioBlob`, `saveRecordingMeta` and the IDB save block |
| Modify | `lib/storage.ts` | Remove library-related functions: `getAudioBlob`, `deleteAudioBlob`, `saveRecordingMeta`, `getRecordingMeta`, `getAllRecordings`, `deleteRecording`, and the IDB layer (`openDB`, `DB_NAME`, etc.) |
| Modify | `types/index.ts` | Remove `AudioEffect`, `RecordingMeta`, stale `MessageType` variants |
| Modify | `lib/storage.test.ts` | Remove tests for deleted functions, fix `waveformZoomMode` reference |
| Modify | `lib/downloader.test.ts` | Fix type errors on mock call args |

---

### Task 1: Delete dead component and hook files

**Files:**
- Delete: `components/RecordingLibrary.tsx`
- Delete: `components/EffectsBar.tsx`
- Delete: `components/PitchShiftControls.tsx`
- Delete: `hooks/useLibrary.ts`
- Delete: `hooks/useLivePitch.ts`

- [ ] **Step 1: Delete the five dead files**

```bash
rm components/RecordingLibrary.tsx \
   components/EffectsBar.tsx \
   components/PitchShiftControls.tsx \
   hooks/useLibrary.ts \
   hooks/useLivePitch.ts
```

- [ ] **Step 2: Verify no remaining imports reference them**

```bash
grep -rn "RecordingLibrary\|EffectsBar\|PitchShiftControls\|useLibrary\|useLivePitch" --include="*.ts" --include="*.tsx"
```

Expected: no output.

- [ ] **Step 3: Type-check passes**

```bash
npx tsc --noEmit 2>&1 | grep -v "\.test\."
```

Expected: only the pre-existing `IDBDatabase` error from `storage.test.ts`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: delete dead components and hooks"
```

---

### Task 2: Remove the dead `effects` array from `audio-engine.ts`

**Files:**
- Modify: `lib/audio-engine.ts`
- Modify: `types/index.ts`

The `effects: AudioEffect[]` array (lines 70–90) and the `AudioEffect` interface are only used by the deleted `EffectsBar.tsx`. The actual functions (`trimAudio`, `reverseAudio`, `decodeAudioBlob`) are still used and stay.

- [ ] **Step 1: Remove the `effects` export and `AudioEffect` import from `audio-engine.ts`**

Delete the `import type { AudioEffect } from '@/types';` on line 1 and the entire `export const effects: AudioEffect[] = [...]` block (lines 70–90). The file should end after the `reverseAudio` function.

- [ ] **Step 2: Remove the `AudioEffect` interface from `types/index.ts`**

Delete lines 37–43:

```typescript
export interface AudioEffect {
  id: string;
  label: string;
  icon?: string;
  panel?: boolean;
  apply: (buffer: AudioBuffer, ctx: OfflineAudioContext) => Promise<AudioBuffer>;
}
```

- [ ] **Step 3: Type-check passes**

```bash
npx tsc --noEmit 2>&1 | grep -v "\.test\."
```

- [ ] **Step 4: Commit**

```bash
git add lib/audio-engine.ts types/index.ts && git commit -m "chore: remove dead AudioEffect type and effects array"
```

---

### Task 3: Remove `loadRecording` and `applyEffect` from `useAudioEditor`

**Files:**
- Modify: `hooks/useAudioEditor.ts`

`loadRecording` loaded a recording by ID from the now-removed library. `applyEffect` was the old effects pipeline (replaced by `FxChain`). Neither is called from any entrypoint.

- [ ] **Step 1: Remove dead code from `useAudioEditor.ts`**

Remove the `getAudioBlob` import (line 4). Remove the `loadRecording` function (lines 42–64). Remove the `applyEffect` function (lines 77–104). Remove both from the return object (lines 135 and 138):

The return should become:

```typescript
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
```

Since `reverseAudio` and `trimAudio` are no longer used in this file after removing `applyEffect`, also remove them from the import on line 3. The import becomes:

```typescript
import { decodeAudioBlob } from '@/lib/audio-engine';
```

- [ ] **Step 2: Type-check passes**

```bash
npx tsc --noEmit 2>&1 | grep -v "\.test\."
```

- [ ] **Step 3: Commit**

```bash
git add hooks/useAudioEditor.ts && git commit -m "chore: remove dead loadRecording and applyEffect from useAudioEditor"
```

---

### Task 4: Remove IDB recording storage from `App.tsx` and `storage.ts`

**Files:**
- Modify: `entrypoints/sidepanel/App.tsx`
- Modify: `lib/storage.ts`

With the recording library gone, saved recordings are written but never read. Remove the write path from `App.tsx` and all library-related storage functions.

- [ ] **Step 1: Remove recording persistence from `handleSave` in `App.tsx`**

In `handleSave`, remove the `saveAudioBlob` and `saveRecordingMeta` block (the `const id = crypto.randomUUID()` through the `saveRecordingMeta({...})` closing paren — approximately lines 124–135 in the current file). Update the import to remove `saveAudioBlob` and `saveRecordingMeta`:

```typescript
import { incrementSaveCount, isReviewDismissed } from '@/lib/storage';
```

- [ ] **Step 2: Remove library-related functions and IDB layer from `storage.ts`**

Delete the entire IndexedDB section: `DB_NAME`, `STORE_NAME`, `DB_VERSION` constants, `openDB()`, `saveAudioBlob()`, `getAudioBlob()`, `deleteAudioBlob()` (lines 9–55).

Delete the recording metadata functions: `saveRecordingMeta()`, `getRecordingMeta()`, `getAllRecordings()`, `deleteRecording()` (lines 57–76).

The only remaining import from `@/types` is `Settings`. Update line 1:

```typescript
import type { Settings } from '@/types';
```

- [ ] **Step 3: Remove `RecordingMeta` from `types/index.ts`**

Delete lines 1–9:

```typescript
export interface RecordingMeta {
  id: string;
  name: string;
  duration: number;
  createdAt: number;
  sampleRate: number;
  channels: number;
  size: number;
}
```

- [ ] **Step 4: Type-check passes**

```bash
npx tsc --noEmit 2>&1 | grep -v "\.test\."
```

- [ ] **Step 5: Commit**

```bash
git add entrypoints/sidepanel/App.tsx lib/storage.ts types/index.ts && git commit -m "chore: remove recording library storage layer and IDB code"
```

---

### Task 5: Remove stale `MessageType` variants from `types/index.ts`

**Files:**
- Modify: `types/index.ts`

`STOP_CAPTURE`, `CAPTURE_STOPPED`, `TIMER_TICK`, and `TIMER_EXPIRED` are defined in the `MessageType` union but never referenced anywhere in the codebase.

- [ ] **Step 1: Verify they are unused**

```bash
grep -rn "STOP_CAPTURE\|CAPTURE_STOPPED\|TIMER_TICK\|TIMER_EXPIRED" --include="*.ts" --include="*.tsx" | grep -v "types/index.ts" | grep -v "\.test\."
```

Expected: no output.

- [ ] **Step 2: Trim the `MessageType` union**

Change it from:

```typescript
export type MessageType =
  | 'START_CAPTURE'
  | 'STOP_CAPTURE'
  | 'CAPTURE_STARTED'
  | 'CAPTURE_STOPPED'
  | 'CAPTURE_ERROR'
  | 'TIMER_TICK'
  | 'TIMER_EXPIRED';
```

To:

```typescript
export type MessageType =
  | 'START_CAPTURE'
  | 'CAPTURE_STARTED'
  | 'CAPTURE_ERROR';
```

- [ ] **Step 3: Type-check passes**

```bash
npx tsc --noEmit 2>&1 | grep -v "\.test\."
```

- [ ] **Step 4: Commit**

```bash
git add types/index.ts && git commit -m "chore: remove unused MessageType variants"
```

---

### Task 6: Remove `EditorState.recordingId` and dead `isProcessing`

**Files:**
- Modify: `types/index.ts`
- Modify: `hooks/useAudioEditor.ts`

`recordingId` was set by the now-deleted `loadRecording`. After Task 3, it's always `null`. `isProcessing` on `EditorState` is set in `useAudioEditor` but never read by any consumer (FxChain has its own `isProcessing`).

- [ ] **Step 1: Verify neither field is read externally**

```bash
grep -rn "recordingId\|editor\.state\.isProcessing\|state\.isProcessing" --include="*.ts" --include="*.tsx" | grep -v "types/index.ts" | grep -v "hooks/useAudioEditor.ts" | grep -v "\.test\."
```

Expected: no output (or only `fx.isProcessing` / `useFxChain` hits, which are a different field).

- [ ] **Step 2: Remove `recordingId` and `isProcessing` from `EditorState` in `types/index.ts`**

Change from:

```typescript
export interface EditorState {
  recordingId: string | null;
  audioBuffer: AudioBuffer | null;
  trimStart: number;
  trimEnd: number;
  isPlaying: boolean;
  isProcessing: boolean;
}
```

To:

```typescript
export interface EditorState {
  audioBuffer: AudioBuffer | null;
  trimStart: number;
  trimEnd: number;
  isPlaying: boolean;
}
```

- [ ] **Step 3: Update `useAudioEditor.ts` to match**

Update `INITIAL_STATE`:

```typescript
const INITIAL_STATE: EditorState = {
  audioBuffer: null,
  trimStart: 0,
  trimEnd: 0,
  isPlaying: false,
};
```

In `loadFromBlob`, remove `isProcessing` and `recordingId` from every `setState` call. The function becomes:

```typescript
const loadFromBlob = useCallback(async (blob: Blob, sampleRate = 44100) => {
  try {
    const audioBuffer = await decodeAudioBlob(blob, sampleRate);
    setState({
      audioBuffer,
      trimStart: 0,
      trimEnd: audioBuffer.duration,
      isPlaying: false,
    });
    return audioBuffer;
  } catch (err) {
    console.error('[Sampler] Failed to decode audio:', err);
    return null;
  }
}, []);
```

In `replaceBuffer`:

```typescript
const replaceBuffer = useCallback((newBuffer: AudioBuffer) => {
  setState({
    audioBuffer: newBuffer,
    trimStart: 0,
    trimEnd: newBuffer.duration,
    isPlaying: false,
  });
}, []);
```

- [ ] **Step 4: Type-check passes**

```bash
npx tsc --noEmit 2>&1 | grep -v "\.test\."
```

- [ ] **Step 5: Commit**

```bash
git add types/index.ts hooks/useAudioEditor.ts && git commit -m "chore: remove dead recordingId and isProcessing from EditorState"
```

---

### Task 7: Fix stale tests

**Files:**
- Modify: `lib/storage.test.ts`
- Modify: `lib/downloader.test.ts`

- [ ] **Step 1: Update `storage.test.ts`**

Remove all imports for deleted functions (`saveRecordingMeta`, `getRecordingMeta`, `getAllRecordings`, `deleteRecording`, `saveAudioBlob`, `getAudioBlob`, `deleteAudioBlob`). Remove the `RecordingMeta` import. Remove the `resetIndexedDB` helper. Remove the entire `recording metadata`, `audio blob storage (IndexedDB)`, and `deleteRecording` describe blocks.

Remove the `waveformZoomMode` assertion on line 53. Change:

```typescript
expect(settings.waveformZoomMode).toBe(DEFAULT_SETTINGS.waveformZoomMode);
```

To:

```typescript
expect(settings.sampleRate).toBe(DEFAULT_SETTINGS.sampleRate);
```

(It already asserts `sampleRate` individually above, so alternatively just delete this line entirely.)

The `fake-indexeddb` import (`forceCloseDatabase`) can also be removed since there are no more IDB tests.

The file should only contain the `settings` describe block.

- [ ] **Step 2: Fix `downloader.test.ts` type errors**

The mock typing is wrong. Change lines 17–19 from:

```typescript
const callArgs = mockBrowser.downloads.download.mock.calls[0][0];
expect(callArgs.filename).toBe('Sampler/my-recording.wav');
expect(callArgs.saveAs).toBe(false);
```

To:

```typescript
const callArgs = mockBrowser.downloads.download.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
expect(callArgs?.filename).toBe('Sampler/my-recording.wav');
expect(callArgs?.saveAs).toBe(false);
```

Apply the same pattern to line 26–27:

```typescript
const callArgs = mockBrowser.downloads.download.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
expect(callArgs?.url).toMatch(/^data:/);
```

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Type-check with test files included**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.test.ts lib/downloader.test.ts && git commit -m "fix: remove stale tests and fix type errors in test files"
```
