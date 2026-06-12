# Chromewave Brand System — Design Spec

## Overview

A light brand system for the "chromewave" Chrome extension (UI name: "Sampler"). The extension records audio from browser tabs and provides trim editing, pitch detection, and an effects chain.

**Brand personality:** Creative instrument meets invisible utility. Refined enough that musicians respect it, quiet enough that it disappears into your toolbar.

**Deliverables:** Logo mark, wordmark lockup, color definitions, usage guidelines, and rasterized assets for the Chrome Web Store and extension manifest.

## Constraints

- Flat solid colors only — no gradients
- Pink (#ffb3c3 / `cw-attention`) is semantic-attention-only — never decorative
- Must read clearly from 16px (Chrome toolbar) to 512px (store listing)
- No waveform-bar representations
- Final refinement happens in Figma; Claude produces research, concepts, and rough SVGs

## Color Palette

Already defined in `entrypoints/sidepanel/style.css`:

| Token | Hex | Usage |
|-------|-----|-------|
| `cw-bg` | #0f1010 | App background |
| `cw-surface` | #161818 | Cards, squircle icon background |
| `cw-border` | #1e2020 | Borders, separators |
| `cw-text` | #f5fad9 | Primary text |
| `cw-primary` | #eef5c5 | Interactive elements, logo mark |
| `cw-attention` | #ffb3c3 | Recording state, errors — semantic only |
| `cw-success` | #b7feae | Confirmation states |
| `cw-warning` | #ffeb80 | Warning states |

The logo mark uses only `cw-primary` (#eef5c5) on `cw-surface` (#161818). Monochromatic.

## Phase 1 — Research & References

### Peer analysis

Collect and analyze logos from three categories that share the target personality:

**Audio/creative tools:**
- Ableton (twin bars), Splice, Loopcloud, Native Instruments Kontakt, Serato
- Focus: how do they symbolize audio without defaulting to waveforms or music notes?

**Invisible utilities with craft:**
- Raycast, Arc Browser, Things 3, 1Password, Ivory
- Focus: how do they achieve personality with extreme simplicity?

**Chrome extensions with strong marks:**
- Vimium, Bitwarden, Momentum
- Focus: what reads well in the 16–32px Chrome toolbar?

### Curated galleries

- **Dribbble** — `"audio icon minimal"`, `"sampler logo mark"`, `"music app icon dark"`
- **Brand New** (underconsideration.com) — branding case studies with reasoning
- **LogoLounge** — trend reports to identify overplayed vs. fresh patterns
- **Apple HIG icon gallery** — reference for marks that scale across sizes

### Research deliverable

A short report (markdown) covering:
- 10–15 reference marks with what makes each work
- Patterns to adopt (shapes, metaphors, weight)
- Patterns to avoid (overused, doesn't scale, wrong personality)
- 3–5 metaphor directions worth exploring as concepts

## Phase 2 — Concept Exploration

### Process

Generate 5–8 distinct SVG concepts. Each explores a **different metaphor** — not variations on one shape. Candidate metaphors from prior brainstorming:

| Metaphor | Source component | Notes |
|----------|-----------------|-------|
| Playhead cursor | `WaveformEditor` | Vertical line + top/bottom triangles. Unique to audio editors. |
| Trim brackets + dot | `WaveformEditor` + `RecordButton` | Two bars flanking a circle. "Capture this." |
| Record dot in ring | `RecordButton` | Circle-in-circle. Simple but generic alone. |
| Tuning fork | `PitchDisplay` | U-shape + stem. Says "audio/tone" without waveforms. |
| Single sine curve | `LiveWaveform` (abstract) | Smooth oscillation, not bars. Waveform-adjacent — may be rejected. |
| Bracket + play triangle | `WaveformEditor` + `PlaybackControls` | Current concept. "Play this captured sample." |

New metaphors from research will be added to this list.

### Testing criteria

Every concept must be rasterized and evaluated at:
- **16px** — toolbar icon. Must be a recognizable silhouette.
- **32px** — extensions page. Details should emerge.
- **48px** — primary extension icon. Full clarity.
- **128px** — store listing. No new detail needed, just crisp.
- **512px** — marketing. Should hold up without looking empty.

Kill anything that turns to mush below 32px.

### Concept deliverable

SVG files in `assets/concepts/` named by metaphor (e.g., `concept-playhead.svg`, `concept-bracket-dot.svg`). A comparison sheet showing all concepts at each size.

## Phase 3 — Figma Refinement

### Process

Take the 2 strongest concepts into Figma for final refinement:

1. **Icon grid alignment** — use a keyline grid (circle + square + orthogonals) to optically balance the mark
2. **Weight tuning** — adjust bar widths, corner radii, and spacing for optical consistency across sizes
3. **Wordmark pairing** — set "chromewave" or "Sampler" in the app's typeface (Archivo) or a complementary face. Test horizontal and stacked lockups.
4. **Lockup spacing** — define clear space (minimum padding around the mark)

### Figma plugins needed

| Plugin | Purpose |
|--------|---------|
| Icon Grid | Keyline grid overlay for optical balance |
| SVG import (native) | Paste SVG → editable Figma vectors |
| Batch Export / Export Kit | Export all sizes in one pass |

## Phase 4 — Asset Export & Guidelines

### Final asset list

| Asset | Format | Location |
|-------|--------|----------|
| Logo mark (with squircle bg) | SVG | `assets/logo-icon.svg` |
| Logo mark (transparent) | SVG | `assets/logo-mark.svg` |
| Icon (extension manifest) | SVG | `assets/icon.svg` |
| Icon mark (transparent) | SVG | `assets/icon-mark.svg` |
| Wordmark lockup | SVG | `assets/logo-wordmark.svg` |
| Extension icons | PNG @16,32,48,96,128 | `public/icon/` |
| Store listing icon | PNG @128,512 | `assets/` |
| Mark only (large) | PNG @512 | `assets/` |

### Usage guidelines

A single markdown file (`docs/brand-guidelines.md`) covering:

- **Mark variants** — when to use icon vs. mark vs. wordmark lockup
- **Color usage** — logo on dark bg, logo on light bg, monochrome fallback
- **Minimum size** — smallest pixel size before the mark breaks down
- **Clear space** — minimum padding around the mark (defined as a ratio of mark height)
- **Don'ts** — no rotation, no color changes, no stretching, no gradients, no drop shadows

### CLI tools

| Tool | Install | Purpose |
|------|---------|---------|
| `sharp-cli` | `npx sharp-cli` | SVG→PNG rasterization (already working) |
| `svgo` | `npx svgo` | Optimize final SVGs |

## Out of Scope

- Motion/animated logo
- Favicon (`.ico`) — Chrome extensions don't use favicons
- Social media templates
- Print assets
