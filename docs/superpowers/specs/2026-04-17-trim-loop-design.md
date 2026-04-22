# Trim Loop — Design Spec

**Date:** 2026-04-17
**Status:** Approved

## Problem

When playback reaches `region.end`, the existing mechanism calls `region.play()` from within the
WaveSurfer `pause` event handler. This creates a stop → restart cycle (WaveSurfer internally calls
`media.pause()`, fires `pause`, then we call `media.play()` again), producing an audible gap at every
loop boundary.

## Goal

When the user is playing audio and the playhead reaches the right trim bar (`region.end`), reset the
playhead to the left trim bar (`region.start`) and continue playing with no interruption.

## Approach: rAF poll + `ws.setTime()`

Run a `requestAnimationFrame` loop while audio is playing. Each frame (~16 ms), check whether
`ws.getCurrentTime() >= region.end`. When true, call `ws.setTime(region.start)` — this sets
`media.currentTime` directly without pausing, so the audio engine keeps running. The seek takes
effect within one frame, imperceptible to the listener.

### Why not `region.play()`

`region.play()` asks WaveSurfer to schedule an internal pause at `region.end`. Our rAF must fire
before that pause is scheduled or cancel it, which is a race. Replacing all `region.play()` calls with
`ws.play()` (plain playback, no scheduled stop) removes the race entirely — the rAF is the sole
authority on when to loop.

---

## Changes to `WaveformEditor.tsx`

### New ref

```ts
const loopRafRef = useRef<number | null>(null);
```

### `startLoopRaf` helper

Cancels any existing rAF handle and starts a new polling loop.

```
tick():
  ws = wavesurferRef.current
  region = regionRef.current
  if !ws or !region or !ws.isPlaying() → loopRafRef.current = null; return
  if ws.getCurrentTime() >= region.end → ws.setTime(region.start)
  loopRafRef.current = requestAnimationFrame(tick)

startLoopRaf():
  if loopRafRef.current !== null → cancelAnimationFrame(loopRafRef.current)
  loopRafRef.current = requestAnimationFrame(tick)
```

### `stopLoopRaf` helper

```
stopLoopRaf():
  if loopRafRef.current !== null → cancelAnimationFrame(loopRafRef.current); loopRafRef.current = null
```

### `pause` event handler — simplified

Remove the loop-back logic. Simplified to:

```
ws.on('pause', () => {
  if programmaticPauseRef.current → return
  stopLoopRaf()
  onPlayingChangeRef.current(false)
})
```

### `finish` event handler — simplified

`finish` only fires when `region.end === file duration` and the rAF lost the race. Treat it as a
fallback restart rather than the primary loop mechanism.

```
ws.on('finish', () => {
  if isPlayingRef.current && regionRef.current {
    ws.seekTo(region.start / ws.getDuration())
    ws.play()
    startLoopRaf()
    return
  }
  stopLoopRaf()
  onPlayingChangeRef.current(false)
})
```

### Replace all `region.play()` calls

Every site that previously called `region.play()` instead does:

```
ws.seekTo(fromSec / ws.getDuration())
ws.play()
startLoopRaf()
```

Call sites:
1. `update-end` handler (resume after trim drag, `if wasPlaying`)
2. Sync play/pause `useEffect` (`if isPlaying && !ws.isPlaying()`)

### `stopLoopRaf` call sites

- `pause` event handler (user-initiated or WaveSurfer-internal pause)
- `finish` event handler (fallback — loop missed)
- Sync play/pause `useEffect` (`if !isPlaying && ws.isPlaying()` branch, before `ws.pause()`)
- Unmount cleanup `useEffect`

---

## Edge cases

| Scenario | Behaviour |
|---|---|
| `region.end === file duration` | rAF catches it first most frames; `finish` handler is fallback |
| Trim drag while playing | `update-end` pauses (`programmaticPauseRef`), seeks, restarts — same as before, rAF restarted |
| User clicks pause | `ws.pause()` → `pause` event → `stopLoopRaf` + `onPlayingChange(false)` |
| User seeks (click on waveform) | `interaction` clamps to region, rAF continues normally from new position |
| `audioBuffer` changes (FX update) | WaveSurfer pauses, `pause` event fires → `stopLoopRaf`; rAF restarted on next play |
| `region.start === region.end` | rAF immediately seeks back every frame — degenerate but harmless; region resize prevents this |

---

## What does NOT change

- WaveSurfer init and region setup
- Pill handle styling
- Label collision detection
- Zoom functionality
- `interaction` handler (click-to-seek clamping)
- `update` region event (scrub audio)
- `programmaticPauseRef` usage in `update-end`
