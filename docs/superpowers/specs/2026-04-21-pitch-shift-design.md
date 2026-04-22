# Pitch Shift Effect — Design Spec

**Date:** 2026-04-21
**Status:** Approved

---

## Overview

Add a destructive pitch-shift effect to ChromeWave's audio editor. The user adjusts semitones and cents, optionally enables formant preservation, then applies. The processed `AudioBuffer` replaces the current one in `EditorState`. No tempo change occurs.

---

## Processing Layer

**New file:** `lib/pitch-shift.ts`

**Public API:**

```ts
applyPitchShift(
  buffer: AudioBuffer,
  semitones: number,   // integer, -12 to +12
  cents: number,       // integer, -100 to +100
  preserveFormants: boolean
): Promise<AudioBuffer>
```

**Implementation details:**

1. **Zero-shift guard** — if `semitones === 0 && cents === 0`, return `buffer` unchanged immediately.
2. **Lazy WASM load** — `rubberband-wasm` module is loaded on first call and cached in module scope. Subsequent calls reuse the cached instance.
3. **Pitch scale** — computed as `2 ** ((semitones + cents / 100) / 12)`.
4. **Stretcher config** — `RubberBandStretcher` created with:
   - `sampleRate` from the input buffer
   - `channels` from the input buffer
   - `timeRatio = 1.0` (pitch-only, no duration change)
   - `pitchScale` from step 3
   - `FormantPreserved` option when `preserveFormants` is true, `FormantShifted` otherwise
5. **Channel processing** — each channel's `Float32Array` is fed through the stretcher independently.
6. **Output buffer** — a new `AudioBuffer` is created at the actual output sample count (not assumed equal to input, due to algorithm latency compensation).

**Invocation:** `PitchShiftControls` calls `applyPitchShift` directly (not through `AudioEffect.apply`) with its local component state, then updates `EditorState.audioBuffer` with the result. This is necessary because `AudioEffect.apply(buffer, ctx)` carries no user parameters — pitch shift needs semitones, cents, and formant flag at call time.

**Registration:** A catalog entry is still added to `lib/audio-engine.ts` (id, label, icon) so `EffectsBar` can render the Pitch button consistently with other effects. The `apply` field is left as a no-op stub on the catalog entry since invocation goes through `PitchShiftControls` directly.

---

## UI

**Location:** A collapsible panel that expands below `EffectsBar` when the user clicks a "Pitch" button.

**Controls:**

| Control | Range | Default | Display |
|---|---|---|---|
| Semitone slider | −12 to +12 (integer steps) | 0 | `+3 st` badge |
| Cents slider | −100 to +100 (integer steps) | 0 | `−25 ¢` badge |
| Formant toggle | on / off | off | Pill toggle labeled "Preserve Formants" |

**Summary display:** A combined readout (e.g. `+3 st −25 ¢`) sits above the sliders so the user always sees the net shift.

**Actions:**
- **Apply** — triggers `applyPitchShift`; disabled and shows spinner while `isProcessing` is true (reuses existing `EditorState.isProcessing` flag).
- **Reset** — link beside Apply; sets semitones = 0, cents = 0, formant toggle = off.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Zero shift (semitones = 0, cents = 0) | Skip processing, return original buffer unchanged |
| WASM load failure | Error surfaces via existing `isProcessing` error path in `EditorState`; Apply button re-enables for retry |
| Output length mismatch | New `AudioBuffer` created at actual output length, not assumed equal to input |
| Stereo audio | Both channels processed independently through the stretcher |

---

## Dependencies

- `rubberband-wasm` — npm package, WASM binary bundled by WXT at build time. All processing is local; no network calls.

---

## Files Touched

| File | Change |
|---|---|
| `lib/pitch-shift.ts` | New — WASM wrapper and `applyPitchShift` function |
| `lib/audio-engine.ts` | Register pitch shift as an `AudioEffect` entry |
| `components/PitchShiftControls.tsx` | New — semitone slider, cents slider, formant toggle, Apply/Reset |
| `components/EffectsBar.tsx` | Add Pitch button that opens/closes the panel |
| `package.json` | Add `rubberband-wasm` dependency |
