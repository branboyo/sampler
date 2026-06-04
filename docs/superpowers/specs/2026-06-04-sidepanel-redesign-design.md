# Sampler — Sidepanel Frontend Redesign

A visual redesign of the Sampler Chrome extension sidepanel. All existing functionality is preserved — this spec covers only the frontend presentation layer.

## Brand

- **Name:** Sampler
- **Aesthetic:** Dark, minimal, structured panels with bezeled outlines. Intentional use of color. Reactive elements as system-state feedback only.

## Design System

### Typography

- **Font:** Archivo (Google Fonts), weights 400/500/600/700
- **Section headers:** 600–700, uppercase, letter-spacing 1–1.5px (e.g., "LIBRARY", "EFFECTS")
- **Body/values:** 400–500
- **Numeric values** (timestamps, Hz, file sizes): `font-variant-numeric: tabular-nums` — no second font

### Color Tokens

| Token | Value | Usage |
|---|---|---|
| `cw-bg` | `#0f1010` | Page background |
| `cw-surface` | `#161818` | Panel/card fill |
| `cw-border` | `#1e2020` | Bezeled panel outlines |
| `cw-text` | `#f5fad9` | Primary text (warm cream) |
| `cw-text-muted` | `rgba(245,250,217,0.35)` | Secondary text, labels |
| `cw-primary` | `#eef5c5` | Buttons, waveform, interactive elements |
| `cw-attention` | `#ffb3c3` | Recording state, playhead, important callouts |
| `cw-success` | `#b7feae` | Format badges, FX active indicators |
| `cw-warning` | `#ffeb80` | Approaching limits, caution states |

### Color Rules

- **No gradients.** All colors are flat/solid.
- **Pink (`cw-attention`) is semantic only.** Every use must direct the user's eye to something that matters right now: recording state, playhead position, important text. Never decorative.

### Panel System

- Panel radius: `16px`
- Card/inner radius: `10px`
- Button radius: `8px`
- Panel fill: `cw-surface` with 1px solid `cw-border`
- No shadows — depth comes from the fill/border brightness step above `cw-bg`

## Layout & State Structure

The sidepanel is ~400px wide. Three app states, each a vertical stack of panels on `cw-bg` with 12px gaps.

### Global Header (all states)

- Left: "Sampler" wordmark (Archivo 600, 15px)
- Right: settings gear icon button
- No panel container — sits on `cw-bg` with 20px horizontal padding
- Thin `cw-border` divider below

### Idle State

1. **Record button panel** — centered 64px `cw-primary` circle with 20px dark inner circle. "tap to record this tab" label in `cw-text-muted` below.
2. **Library panel** — "LIBRARY" header + recording count. Vertical list of items: filename (`cw-text`, 13px, 500), metadata line (duration + size in `cw-text-muted`, 11px), format badge pill. Tapping opens the editor.

### Recording State

1. **Timer panel** — centered timestamp (Archivo 700, ~44px). Milliseconds at ~28px in `cw-text-muted`. 3px progress bar: `cw-border` track, `cw-attention` fill. Min/max labels at edges. Panel border shifts to `cw-attention` at ~15% opacity.
2. **Live waveform panel** — canvas frequency bars (3px wide, 2px gaps) in solid `cw-primary`. Full interior width.
3. **Pitch display panel** — note letter (Archivo 700, 28px, `cw-primary`), octave (16px, `cw-text-muted`), frequency right-aligned in `cw-text-muted`, cents in `cw-success` (< 10 cents) or `cw-warning`.
4. **Stop button** — centered 56px `cw-attention` circle with dark rounded-square inside.

### Editing State

1. **Filename bar panel** — editable filename (14px, 600, `cw-text`) with pencil icon. Inline edit via underline input. Metadata right-aligned in `cw-text-muted`.
2. **Waveform editor panel** — WaveSurfer waveform in `cw-primary`. Trim region: `rgba(238,245,197,0.06)` background between two `cw-primary` handle bars (12px tall, 4px wide, rounded). Playhead: 2px `cw-attention` line with 4px glow at 20% opacity. Regions outside trim: 30% waveform opacity. Trim timestamps below handles in `cw-text-muted`.
3. **Playback controls** — no panel, sits on `cw-bg`. Play/pause: 48px solid `cw-primary` circle. Skip buttons: 36px outline circles with `cw-border` and `cw-text` icons.
4. **FX chain panel** — "EFFECTS" header + "Add" pill button (`cw-surface`/`cw-border`). Stacked FX cards: 6px active dot (colored per type), name, value in `cw-text-muted`, expand chevron. Expanded: parameter sliders with `cw-border` track, `cw-primary` fill/thumb. Drag-to-reorder via handle icon.
5. **Save controls** — horizontal row, no panel. Format selector: `cw-surface`/`cw-border` button with dropdown chevron. Save button: solid `cw-primary`, dark text (Archivo 600).

## Component Details

### Record Button

- 64px `cw-primary` circle, 20px dark inner circle
- Hover: brightness filter ~1.1
- Press: scale(0.96), 100ms ease-out

### Stop Button

- 56px `cw-attention` circle, 16px dark rounded-square inside
- Pink because recording = attention state

### Live Waveform

- Canvas-based frequency bars, 3px wide, 2px gaps
- Solid `cw-primary`, opacity varies with amplitude (40–100%)
- Full panel interior width

### Recording Timer

- Archivo 700, ~44px, `cw-text`
- Milliseconds: ~28px, `cw-text-muted`
- Progress bar: 3px, `cw-border` track, `cw-attention` fill
- Last 30 seconds: time text shifts to `cw-warning`

### Pitch Display

- Note: Archivo 700, 28px, `cw-primary`
- Octave: 16px, `cw-text-muted`, baseline-aligned
- Frequency: 12px, `cw-text-muted`, right-aligned
- Cents: 11px, `cw-success` if < 10, `cw-warning` if drifting

### Waveform Editor

- WaveSurfer waveform in `cw-primary`
- Trim handles: 12px tall, 4px wide, `cw-primary`, rounded
- Playhead: 2px `cw-attention` line, 4px glow at 20% opacity
- Outside trim: 30% opacity
- Drag-to-seek enabled

### Playback Controls

- Play/pause: 48px `cw-primary` circle, dark icon
- Skip: 36px, 1px `cw-border` outline, `cw-text` icon
- No panel wrapping

### FX Chain Cards

- Fill: `cw-surface`, 1px `cw-border`, 10px radius
- Active dot: 6px, `cw-success` (reverb/delay), `cw-warning` (pitch shift), `cw-text-muted` (disabled)
- Expanded: sliders with `cw-border` track, `cw-primary` fill/thumb
- Drag-to-reorder via handle icon

### Save Controls

- Format selector: `cw-surface`/`cw-border`, shows format + chevron
- Save button: `cw-primary` fill, `cw-bg` text, Archivo 600

### Library Items

- `cw-surface` fill, 1px `cw-border`, 10px radius
- Filename: `cw-text`, 13px, 500
- Metadata: duration + size, `cw-text-muted`, 11px
- Format badge: pill, background at 10% of badge color, text in badge color

### Filename Editor

- Filename: `cw-text`, 14px, 600, with pencil icon in `cw-text-muted`
- Edit mode: inline text input with `cw-border` underline
- Metadata right-aligned in `cw-text-muted`

## Reactive & Dynamic Elements

Animation exists only as system-state feedback. If something moves or glows, it communicates what is happening right now.

### Record Button Glow

- Box-shadow on the button: `0 0 60px rgba(238,245,197,0.08)`
- Pulses between 0.04 and 0.1 opacity on 3s ease-in-out cycle when idle
- Snaps off when recording begins

### Recording State Pulse

- REC dot (8px, `cw-attention`) in header pulses opacity 0.4–1.0 on 1.5s cycle
- Timer panel border shifts to `cw-attention` at ~15% opacity

### Live Waveform Reactivity

- Bar heights interpolate smoothly per frame
- Peak bars: full `cw-primary` opacity. Quiet bars: 40–50%
- No color shifts

### Playhead Glow

- `cw-attention` line with 4px box-shadow at 20% opacity during playback

### FX Active Dots

- Processing: 6px dot pulses box-shadow (same color, 40%, 4px spread, 2s cycle)
- Disabled: `cw-text-muted`, no animation

### Button Interactions

- Hover: brightness(1.1)
- Press: scale(0.96), 100ms ease-out
- No color-change hovers or border animations

### State Transitions

- Cross-fade between states: 150ms opacity
- Panels fade in staggered: 50ms delay per panel, top to bottom
- No sliding or layout morphing

### Intentionally Not Animated

- Background: static `cw-bg`
- Panel borders (except recording state pink bezel)
- Typography (timer updates values, does not animate them)
- Library items
