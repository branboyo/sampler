# Trim Handle Visibility & Label Overlap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make trim handles visually discoverable via a pill grip, and replace overlapping timestamp labels with a `–` dash when handles are too close.

**Architecture:** Both changes live entirely inside `components/WaveformEditor.tsx`. Handle styling is applied imperatively via the existing `addRegion` helper (runs on every source load and FX reload). Label logic is a render-time computation that switches between normal two-label layout and a single centred dash based on pixel-measured collision.

**Tech Stack:** React 18, TypeScript, WaveSurfer.js v7 (RegionsPlugin), Tailwind v4

---

## File Map

| File | Change |
|---|---|
| `components/WaveformEditor.tsx` | Task 1: style handles in `addRegion`. Task 2: two-tier label logic in render. |

---

### Task 1: Pill Handle Styling

**Files:**
- Modify: `components/WaveformEditor.tsx` — `addRegion` callback

- [ ] **Step 1: Add handle styling block inside `addRegion`**

Locate the `addRegion` useCallback in `WaveformEditor.tsx`. After the `wireRegionEvents(region, buffer)` call and before `return region`, insert:

```typescript
  // ── Style trim handles ──────────────────────────────────────────────────────
  for (const side of ['left', 'right'] as const) {
    const h = region.element.querySelector(
      `[data-resize="${side}"]`,
    ) as HTMLElement | null;
    if (!h) continue;

    // Thin track line
    h.style.width = '2px';
    h.style.background = 'rgba(103, 232, 249, 0.65)';

    // Pill grip
    const pill = document.createElement('div');
    Object.assign(pill.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '13px',
      height: '26px',
      borderRadius: '6px',
      background: 'rgba(103, 232, 249, 0.92)',
      boxShadow: '0 0 10px rgba(103,232,249,0.5)',
      transition: 'background 0.15s, box-shadow 0.15s',
      cursor: 'default',   // suppresses inherited ew-resize
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
    });

    // Three horizontal grip dashes
    for (let i = 0; i < 3; i++) {
      const dash = document.createElement('div');
      Object.assign(dash.style, {
        width: '5px',
        height: '1.5px',
        background: 'rgba(15, 17, 30, 0.5)',
        borderRadius: '1px',
        pointerEvents: 'none',
        flexShrink: '0',
      });
      pill.appendChild(dash);
    }

    // Hover glow
    pill.addEventListener('pointerenter', () => {
      pill.style.background = 'rgba(103, 232, 249, 1)';
      pill.style.boxShadow =
        '0 0 16px rgba(103,232,249,0.75), 0 0 4px rgba(103,232,249,1)';
    });
    pill.addEventListener('pointerleave', () => {
      pill.style.background = 'rgba(103, 232, 249, 0.92)';
      pill.style.boxShadow = '0 0 10px rgba(103,232,249,0.5)';
    });

    h.appendChild(pill);
  }
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Visual verification**

```bash
npm run dev
```

Load a recording. The trim handles should now show as:
- A 2px translucent cyan track line
- A 13×26px rounded pill centred on the track
- Three small horizontal dashes inside the pill
- Pill brightens and glows on hover
- Dragging still works (pill events bubble to WaveSurfer's handle)

- [ ] **Step 4: Commit**

```bash
git add components/WaveformEditor.tsx
git commit -m "feat: add pill grip handles to trim region"
```

---

### Task 2: Two-Tier Label Logic

**Files:**
- Modify: `components/WaveformEditor.tsx` — render section (the `ready && (...)` label block)

- [ ] **Step 1: Replace the render-section label variables**

In the `// ── Render` section, the current code computes:

```typescript
const duration = audioBuffer?.duration ?? 1;
const startPct = (displayStart / duration) * 100;
const endPct = (displayEnd / duration) * 100;
```

Replace with:

```typescript
const duration = audioBuffer?.duration ?? 1;
const startPct = (displayStart / duration) * 100; // still used for zoom bubble anchor
const endPct = (displayEnd / duration) * 100;     // still used for zoom bubble anchor

// ── Label collision detection ────────────────────────────────────────────────
const containerW = containerRef.current?.clientWidth ?? 0;
const LABEL_W = 58;   // approx rendered px width of "M:SS.SSS"
const LABEL_GAP = 6;  // min px gap between label edges

// raw handle positions in px (0 when container not yet measured)
const rawLeftPx  = containerW > 0 ? (displayStart / duration) * containerW : 0;
const rawRightPx = containerW > 0 ? (displayEnd   / duration) * containerW : 0;

// Left label spans rawLeftPx → rawLeftPx + LABEL_W  (anchor='start')
// Right label spans rawRightPx - LABEL_W → rawRightPx (anchor='end')
// Collision when those ranges overlap by more than LABEL_GAP
const labelsCollide =
  containerW > 0 && rawRightPx - rawLeftPx < 2 * LABEL_W + LABEL_GAP;
const midLabelPx = (rawLeftPx + rawRightPx) / 2;
```

- [ ] **Step 2: Replace the label JSX block**

Find the existing label block:

```tsx
      {/* Trim time labels */}
      {ready && (
        <div className="relative mt-1 h-5">
          <EditableTrimTime
            value={displayStart}
            min={0}
            max={displayEnd - 0.001}
            anchor="start"
            style={{ left: `${startPct}%` }}
            onCommit={(v) => {
              onTrimChangeRef.current(v, displayEnd);
              regionRef.current?.setOptions({ start: v });
            }}
          />
          <EditableTrimTime
            value={displayEnd}
            min={displayStart + 0.001}
            max={duration}
            anchor="end"
            style={{ left: `${endPct}%` }}
            onCommit={(v) => {
              onTrimChangeRef.current(displayStart, v);
              regionRef.current?.setOptions({ end: v });
            }}
          />
        </div>
      )}
```

Replace it with:

```tsx
      {/* Trim time labels */}
      {ready && (
        <div className="relative mt-1 h-5">
          {labelsCollide ? (
            /* Handles too close — single dash at midpoint */
            <span
              className="absolute -translate-x-1/2 font-mono text-[10px] text-cw-timestamp select-none"
              style={{ left: `${midLabelPx}px` }}
            >
              –
            </span>
          ) : (
            <>
              <EditableTrimTime
                value={displayStart}
                min={0}
                max={displayEnd - 0.001}
                anchor="start"
                style={{
                  left: containerW > 0 ? `${rawLeftPx}px` : `${startPct}%`,
                }}
                onCommit={(v) => {
                  onTrimChangeRef.current(v, displayEnd);
                  regionRef.current?.setOptions({ start: v });
                }}
              />
              <EditableTrimTime
                value={displayEnd}
                min={displayStart + 0.001}
                max={duration}
                anchor="end"
                style={{
                  left: containerW > 0 ? `${rawRightPx}px` : `${endPct}%`,
                }}
                onCommit={(v) => {
                  onTrimChangeRef.current(displayStart, v);
                  regionRef.current?.setOptions({ end: v });
                }}
              />
            </>
          )}
        </div>
      )}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Visual verification — labels far apart**

```bash
npm run dev
```

With handles at their default positions (full width), both timestamp labels should be visible: start time left-anchored at the left handle, end time right-anchored at the right handle.

- [ ] **Step 5: Visual verification — labels colliding**

Drag the left handle most of the way to the right (or the right handle most of the way to the left) until the handles are close. Both timestamp labels should disappear and be replaced by a single `–` centred between the handles.

- [ ] **Step 6: Commit**

```bash
git add components/WaveformEditor.tsx
git commit -m "feat: two-tier label layout — dash when trim handles overlap"
```
