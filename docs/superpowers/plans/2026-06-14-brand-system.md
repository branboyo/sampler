# Chromewave Brand System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a light brand system for chromewave — logo mark concepts, multi-size testing, brand guidelines, and final assets ready for Figma refinement.

**Architecture:** Four-phase pipeline: (1) research peer logos and write a reference report, (2) generate 6 distinct SVG concepts each exploring a different metaphor, rasterize and test at all target sizes, (3) user picks 2 for Figma refinement (manual), (4) export final assets and write brand guidelines.

**Tech Stack:** Hand-crafted SVG, `sharp-cli` for SVG→PNG rasterization, `svgo` for SVG optimization, plain markdown for docs.

---

## File Structure

```
assets/
  concepts/                      # NEW — concept SVGs (Phase 2)
    concept-playhead.svg
    concept-bracket-dot.svg
    concept-record-ring.svg
    concept-tuning-fork.svg
    concept-sine-curve.svg
    concept-bracket-play.svg
    sizes/                       # NEW — rasterized test PNGs
      {concept}-16.png
      {concept}-32.png
      {concept}-48.png
      {concept}-128.png
      {concept}-512.png
    comparison.html              # NEW — side-by-side comparison page
  logo-icon.svg                  # EXISTS — will be replaced with final
  logo-mark.svg                  # EXISTS — will be replaced with final
  icon.svg                       # EXISTS — will be replaced with final
  icon-mark.svg                  # EXISTS — will be replaced with final
  logo-wordmark.svg              # NEW — wordmark lockup
  logo.svg                       # EXISTS — will be replaced with final
  logo-icon-128.png              # EXISTS — regenerated from final
  logo-icon-512.png              # EXISTS — regenerated from final
  logo-mark-512.png              # EXISTS — regenerated from final
public/icon/
  16.png, 32.png, 48.png,        # EXISTS — regenerated from final
  96.png, 128.png
docs/
  brand-research.md              # NEW — research report (Phase 1)
  brand-guidelines.md            # NEW — usage guidelines (Phase 4)
```

---

### Task 1: Research — Peer Logo Analysis

**Files:**
- Create: `docs/brand-research.md`

Research logos across three peer categories and curated galleries. Write a structured report.

- [ ] **Step 1: Search audio/creative tool logos**

Search the web for logo analysis of: Ableton, Splice, Loopcloud, Native Instruments Kontakt, Serato. Focus on how they symbolize audio without waveform bars or music notes. Note the shapes, stroke weights, and metaphors each uses.

Run:
```bash
# Use WebSearch or browser to research each brand's logo mark
# For each, note: shape, metaphor, color count, smallest usable size
```

- [ ] **Step 2: Search invisible-utility logos**

Search for: Raycast, Arc Browser, Things 3, 1Password, Ivory. Focus on how they achieve personality with extreme simplicity. Note what makes each recognizable at small sizes.

- [ ] **Step 3: Search Chrome extension logos**

Search for: Vimium, Bitwarden, Momentum. Focus on what reads well in the 16–32px Chrome toolbar.

- [ ] **Step 4: Search curated galleries**

Search Dribbble for `"audio icon minimal"`, `"sampler logo mark"`, `"music app icon dark"`. Search Brand New (underconsideration.com) for recent audio/music branding case studies. Note any fresh metaphors not in the existing candidate list.

- [ ] **Step 5: Write the research report**

Create `docs/brand-research.md` with this structure:

```markdown
# Chromewave Brand Research

## Reference Marks

### Audio/Creative Tools
<!-- For each logo: one-line description, what makes it work, what to learn from it -->

### Invisible Utilities
<!-- Same format -->

### Chrome Extensions
<!-- Same format -->

### Gallery Finds
<!-- Any standout marks from Dribbble/Brand New searches -->

## Patterns to Adopt
<!-- Shapes, metaphors, and weights that work for our personality -->

## Patterns to Avoid
<!-- Overused motifs, things that don't scale, wrong personality -->

## Metaphor Directions
<!-- 3-5 metaphor directions worth exploring, including any new ones discovered -->
```

- [ ] **Step 6: Commit**

```bash
git add docs/brand-research.md
git commit -m "docs: add brand research report with peer logo analysis"
```

---

### Task 2: Concept — Playhead Cursor

**Files:**
- Create: `assets/concepts/concept-playhead.svg`
- Create: `assets/concepts/sizes/concept-playhead-{16,32,48,128,512}.png`

The playhead cursor from `WaveformEditor` — a vertical stem with triangular arrows at top and bottom. Unique to audio editors, not found in other icon vocabularies.

- [ ] **Step 1: Create the SVG**

Create `assets/concepts/concept-playhead.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="28" fill="#161818"/>
  <!-- Top arrow -->
  <polygon points="64,24 50,42 78,42" fill="#eef5c5"/>
  <!-- Stem -->
  <rect x="60" y="42" width="8" height="44" rx="4" fill="#eef5c5"/>
  <!-- Bottom arrow -->
  <polygon points="64,104 50,86 78,86" fill="#eef5c5"/>
</svg>
```

- [ ] **Step 2: Rasterize at all test sizes**

```bash
mkdir -p assets/concepts/sizes
for size in 16 32 48 128 512; do
  npx sharp-cli -i assets/concepts/concept-playhead.svg \
    -o assets/concepts/sizes/concept-playhead-${size}.png \
    resize ${size} ${size}
done
```

- [ ] **Step 3: Inspect at small sizes**

Read `assets/concepts/sizes/concept-playhead-16.png` and `concept-playhead-32.png`. Verify the mark is recognizable as a distinct silhouette — the triangles and stem should still read as a cohesive shape, not a blob.

- [ ] **Step 4: Commit**

```bash
git add assets/concepts/concept-playhead.svg assets/concepts/sizes/concept-playhead-*.png
git commit -m "brand: add playhead cursor concept"
```

---

### Task 3: Concept — Trim Brackets + Dot

**Files:**
- Create: `assets/concepts/concept-bracket-dot.svg`
- Create: `assets/concepts/sizes/concept-bracket-dot-{16,32,48,128,512}.png`

Two vertical trim-handle bars from `WaveformEditor` flanking a centered circle from `RecordButton`. Reads as "capture this recording."

- [ ] **Step 1: Create the SVG**

Create `assets/concepts/concept-bracket-dot.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="28" fill="#161818"/>
  <!-- Left trim bracket -->
  <rect x="24" y="30" width="12" height="68" rx="6" fill="#eef5c5"/>
  <!-- Record dot -->
  <circle cx="64" cy="64" r="14" fill="#eef5c5"/>
  <!-- Right trim bracket -->
  <rect x="92" y="30" width="12" height="68" rx="6" fill="#eef5c5"/>
</svg>
```

- [ ] **Step 2: Rasterize at all test sizes**

```bash
for size in 16 32 48 128 512; do
  npx sharp-cli -i assets/concepts/concept-bracket-dot.svg \
    -o assets/concepts/sizes/concept-bracket-dot-${size}.png \
    resize ${size} ${size}
done
```

- [ ] **Step 3: Inspect at small sizes**

Read the 16px and 32px PNGs. At 16px the dot should still be visible between the brackets — if it merges with them, increase the gap or reduce the dot radius.

- [ ] **Step 4: Commit**

```bash
git add assets/concepts/concept-bracket-dot.svg assets/concepts/sizes/concept-bracket-dot-*.png
git commit -m "brand: add trim brackets + dot concept"
```

---

### Task 4: Concept — Record Ring

**Files:**
- Create: `assets/concepts/concept-record-ring.svg`
- Create: `assets/concepts/sizes/concept-record-ring-{16,32,48,128,512}.png`

A circle-in-circle from `RecordButton` — a ring with a filled dot inside. The outer ring references the button shape, the inner dot references the record state.

- [ ] **Step 1: Create the SVG**

Create `assets/concepts/concept-record-ring.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="28" fill="#161818"/>
  <!-- Outer ring -->
  <circle cx="64" cy="64" r="34" stroke="#eef5c5" stroke-width="6" fill="none"/>
  <!-- Inner dot -->
  <circle cx="64" cy="64" r="12" fill="#eef5c5"/>
</svg>
```

- [ ] **Step 2: Rasterize at all test sizes**

```bash
for size in 16 32 48 128 512; do
  npx sharp-cli -i assets/concepts/concept-record-ring.svg \
    -o assets/concepts/sizes/concept-record-ring-${size}.png \
    resize ${size} ${size}
done
```

- [ ] **Step 3: Inspect at small sizes**

Read the 16px and 32px PNGs. The ring and dot must remain visually distinct — if the stroke and dot merge, the stroke-width or gap needs adjustment.

- [ ] **Step 4: Commit**

```bash
git add assets/concepts/concept-record-ring.svg assets/concepts/sizes/concept-record-ring-*.png
git commit -m "brand: add record ring concept"
```

---

### Task 5: Concept — Tuning Fork

**Files:**
- Create: `assets/concepts/concept-tuning-fork.svg`
- Create: `assets/concepts/sizes/concept-tuning-fork-{16,32,48,128,512}.png`

A stylized tuning fork from `PitchDisplay`. Two prongs connected by a U-curve with a stem below. Says "audio/tone" without waveforms. Musical and distinctive.

- [ ] **Step 1: Create the SVG**

Create `assets/concepts/concept-tuning-fork.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="28" fill="#161818"/>
  <!-- Left prong -->
  <rect x="42" y="24" width="8" height="40" rx="4" fill="#eef5c5"/>
  <!-- Right prong -->
  <rect x="78" y="24" width="8" height="40" rx="4" fill="#eef5c5"/>
  <!-- U-curve connecting prongs at bottom -->
  <path d="M 46,60 C 46,88 82,88 82,60" stroke="#eef5c5" stroke-width="8" stroke-linecap="round" fill="none"/>
  <!-- Stem -->
  <rect x="60" y="78" width="8" height="26" rx="4" fill="#eef5c5"/>
</svg>
```

- [ ] **Step 2: Rasterize at all test sizes**

```bash
for size in 16 32 48 128 512; do
  npx sharp-cli -i assets/concepts/concept-tuning-fork.svg \
    -o assets/concepts/sizes/concept-tuning-fork-${size}.png \
    resize ${size} ${size}
done
```

- [ ] **Step 3: Inspect at small sizes**

Read the 16px and 32px PNGs. The two prongs must remain distinct from each other and the U-curve must be readable as a curve (not a filled blob). If it collapses, simplify to thinner strokes or wider prong spacing.

- [ ] **Step 4: Commit**

```bash
git add assets/concepts/concept-tuning-fork.svg assets/concepts/sizes/concept-tuning-fork-*.png
git commit -m "brand: add tuning fork concept"
```

---

### Task 6: Concept — Sine Curve

**Files:**
- Create: `assets/concepts/concept-sine-curve.svg`
- Create: `assets/concepts/sizes/concept-sine-curve-{16,32,48,128,512}.png`

A single smooth sine wave oscillation from `LiveWaveform` — one S-curve. Abstract, organic, references "wave" in "chromewave." Not bars, so it avoids the waveform-bar restriction, but is waveform-adjacent — may be rejected.

- [ ] **Step 1: Create the SVG**

Create `assets/concepts/concept-sine-curve.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="28" fill="#161818"/>
  <!-- Single sine oscillation -->
  <path d="M 22,64 C 36,28 50,28 64,64 C 78,100 92,100 106,64"
        stroke="#eef5c5" stroke-width="7" stroke-linecap="round" fill="none"/>
</svg>
```

- [ ] **Step 2: Rasterize at all test sizes**

```bash
for size in 16 32 48 128 512; do
  npx sharp-cli -i assets/concepts/concept-sine-curve.svg \
    -o assets/concepts/sizes/concept-sine-curve-${size}.png \
    resize ${size} ${size}
done
```

- [ ] **Step 3: Inspect at small sizes**

Read the 16px and 32px PNGs. The S-curve must still read as a wave — if it looks like a diagonal line or blob at 16px, this concept fails the small-size test. Note the result honestly.

- [ ] **Step 4: Commit**

```bash
git add assets/concepts/concept-sine-curve.svg assets/concepts/sizes/concept-sine-curve-*.png
git commit -m "brand: add sine curve concept"
```

---

### Task 7: Concept — Bracket + Play Triangle

**Files:**
- Create: `assets/concepts/concept-bracket-play.svg`
- Create: `assets/concepts/sizes/concept-bracket-play-{16,32,48,128,512}.png`

Two trim-handle brackets from `WaveformEditor` flanking a play triangle from `PlaybackControls`. This is the current working concept — included for comparison alongside the new options.

- [ ] **Step 1: Create the SVG**

Create `assets/concepts/concept-bracket-play.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="28" fill="#161818"/>
  <!-- Left trim bracket -->
  <rect x="24" y="30" width="12" height="68" rx="6" fill="#eef5c5"/>
  <!-- Play triangle -->
  <polygon points="48,40 48,88 80,64" fill="#eef5c5"/>
  <!-- Right trim bracket -->
  <rect x="92" y="30" width="12" height="68" rx="6" fill="#eef5c5"/>
</svg>
```

- [ ] **Step 2: Rasterize at all test sizes**

```bash
for size in 16 32 48 128 512; do
  npx sharp-cli -i assets/concepts/concept-bracket-play.svg \
    -o assets/concepts/sizes/concept-bracket-play-${size}.png \
    resize ${size} ${size}
done
```

- [ ] **Step 3: Inspect at small sizes**

Read the 16px and 32px PNGs. The triangle should be distinguishable from the brackets — if they all merge into a rectangular mass, the gaps need to be wider.

- [ ] **Step 4: Commit**

```bash
git add assets/concepts/concept-bracket-play.svg assets/concepts/sizes/concept-bracket-play-*.png
git commit -m "brand: add bracket + play triangle concept"
```

---

### Task 8: Comparison Sheet & Size Test

**Files:**
- Create: `assets/concepts/comparison.html`

Build a single HTML page that displays every concept at every size side-by-side for easy visual comparison.

- [ ] **Step 1: Create the comparison page**

Create `assets/concepts/comparison.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Chromewave Logo Concepts — Comparison</title>
  <style>
    body {
      background: #0f1010;
      color: #f5fad9;
      font-family: 'Inter', system-ui, sans-serif;
      padding: 40px;
      margin: 0;
    }
    h1 { font-size: 18px; font-weight: 600; margin-bottom: 32px; }
    h2 { font-size: 13px; font-weight: 500; color: rgba(245,250,217,0.5); margin: 24px 0 12px; }
    .grid {
      display: grid;
      grid-template-columns: 140px repeat(5, auto);
      gap: 16px;
      align-items: center;
    }
    .label {
      font-size: 12px;
      color: rgba(245,250,217,0.6);
    }
    .size-label {
      font-size: 11px;
      color: rgba(245,250,217,0.35);
      text-align: center;
    }
    img {
      display: block;
      image-rendering: pixelated;
    }
    .cell { text-align: center; }
  </style>
</head>
<body>
  <h1>Chromewave Logo Concepts</h1>
  <div class="grid">
    <div></div>
    <div class="size-label">16px</div>
    <div class="size-label">32px</div>
    <div class="size-label">48px</div>
    <div class="size-label">128px</div>
    <div class="size-label">512px</div>

    <div class="label">Playhead Cursor</div>
    <div class="cell"><img src="sizes/concept-playhead-16.png" width="16" height="16"></div>
    <div class="cell"><img src="sizes/concept-playhead-32.png" width="32" height="32"></div>
    <div class="cell"><img src="sizes/concept-playhead-48.png" width="48" height="48"></div>
    <div class="cell"><img src="sizes/concept-playhead-128.png" width="128" height="128"></div>
    <div class="cell"><img src="sizes/concept-playhead-512.png" width="128" height="128"></div>

    <div class="label">Brackets + Dot</div>
    <div class="cell"><img src="sizes/concept-bracket-dot-16.png" width="16" height="16"></div>
    <div class="cell"><img src="sizes/concept-bracket-dot-32.png" width="32" height="32"></div>
    <div class="cell"><img src="sizes/concept-bracket-dot-48.png" width="48" height="48"></div>
    <div class="cell"><img src="sizes/concept-bracket-dot-128.png" width="128" height="128"></div>
    <div class="cell"><img src="sizes/concept-bracket-dot-512.png" width="128" height="128"></div>

    <div class="label">Record Ring</div>
    <div class="cell"><img src="sizes/concept-record-ring-16.png" width="16" height="16"></div>
    <div class="cell"><img src="sizes/concept-record-ring-32.png" width="32" height="32"></div>
    <div class="cell"><img src="sizes/concept-record-ring-48.png" width="48" height="48"></div>
    <div class="cell"><img src="sizes/concept-record-ring-128.png" width="128" height="128"></div>
    <div class="cell"><img src="sizes/concept-record-ring-512.png" width="128" height="128"></div>

    <div class="label">Tuning Fork</div>
    <div class="cell"><img src="sizes/concept-tuning-fork-16.png" width="16" height="16"></div>
    <div class="cell"><img src="sizes/concept-tuning-fork-32.png" width="32" height="32"></div>
    <div class="cell"><img src="sizes/concept-tuning-fork-48.png" width="48" height="48"></div>
    <div class="cell"><img src="sizes/concept-tuning-fork-128.png" width="128" height="128"></div>
    <div class="cell"><img src="sizes/concept-tuning-fork-512.png" width="128" height="128"></div>

    <div class="label">Sine Curve</div>
    <div class="cell"><img src="sizes/concept-sine-curve-16.png" width="16" height="16"></div>
    <div class="cell"><img src="sizes/concept-sine-curve-32.png" width="32" height="32"></div>
    <div class="cell"><img src="sizes/concept-sine-curve-48.png" width="48" height="48"></div>
    <div class="cell"><img src="sizes/concept-sine-curve-128.png" width="128" height="128"></div>
    <div class="cell"><img src="sizes/concept-sine-curve-512.png" width="128" height="128"></div>

    <div class="label">Brackets + Play</div>
    <div class="cell"><img src="sizes/concept-bracket-play-16.png" width="16" height="16"></div>
    <div class="cell"><img src="sizes/concept-bracket-play-32.png" width="32" height="32"></div>
    <div class="cell"><img src="sizes/concept-bracket-play-48.png" width="48" height="48"></div>
    <div class="cell"><img src="sizes/concept-bracket-play-128.png" width="128" height="128"></div>
    <div class="cell"><img src="sizes/concept-bracket-play-512.png" width="128" height="128"></div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add assets/concepts/comparison.html
git commit -m "brand: add concept comparison page"
```

---

### Task 9: User Selection Checkpoint

**CHECKPOINT — requires user input before proceeding.**

Present the comparison page and all 128px concept PNGs to the user. Ask them to pick their top 2 concepts for Figma refinement.

- [ ] **Step 1: Open comparison page**

```bash
open assets/concepts/comparison.html
```

Or read each 128px PNG and present them inline.

- [ ] **Step 2: Ask user to pick 2 concepts**

Present the 6 concepts and ask the user which 2 they want to take into Figma. Record the selection — Tasks 10–13 operate on the chosen concepts only.

---

### Task 10: Figma Handoff Prep

**Files:**
- Modify: `assets/concepts/{selected-concept-1}.svg`
- Modify: `assets/concepts/{selected-concept-2}.svg`

Optimize the 2 selected SVGs for clean Figma import.

- [ ] **Step 1: Optimize selected SVGs with svgo**

```bash
npx svgo assets/concepts/{selected-1}.svg -o assets/concepts/{selected-1}.svg
npx svgo assets/concepts/{selected-2}.svg -o assets/concepts/{selected-2}.svg
```

- [ ] **Step 2: Verify SVGs still render correctly**

Read each optimized SVG to confirm svgo didn't break the paths or shapes. Re-rasterize at 128px and compare visually.

```bash
for concept in {selected-1} {selected-2}; do
  npx sharp-cli -i assets/concepts/${concept}.svg \
    -o assets/concepts/sizes/${concept}-128.png \
    resize 128 128
done
```

- [ ] **Step 3: Commit**

```bash
git add assets/concepts/
git commit -m "brand: optimize selected concepts for Figma import"
```

**HANDOFF — User takes the 2 optimized SVGs into Figma for refinement. Figma work includes: icon grid alignment, weight tuning, wordmark pairing (Archivo or complementary face), and lockup spacing. Recommended Figma plugins: Icon Grid, Batch Export / Export Kit.**

---

### Task 11: Final Asset Export

**Files:**
- Modify: `assets/logo-icon.svg`
- Modify: `assets/logo-mark.svg`
- Modify: `assets/icon.svg`
- Modify: `assets/icon-mark.svg`
- Modify: `assets/logo.svg`
- Modify: `assets/logo-icon-128.png`
- Modify: `assets/logo-icon-512.png`
- Modify: `assets/logo-mark-512.png`
- Modify: `public/icon/16.png`, `32.png`, `48.png`, `96.png`, `128.png`

After Figma refinement, the user provides the final SVG. This task places it in all required locations and generates every PNG size.

- [ ] **Step 1: Place the final SVG in all icon slots**

Copy the Figma-refined SVG into each asset location. The squircle-background version goes to `logo-icon.svg` and `icon.svg`. The transparent version (no background rect) goes to `logo-mark.svg`, `icon-mark.svg`, and `logo.svg`.

```bash
# User provides the final SVG content — write it to each file
# logo-icon.svg = icon.svg (with squircle bg)
# logo-mark.svg = icon-mark.svg = logo.svg (mark only, transparent)
```

- [ ] **Step 2: Generate all PNG rasterizations**

```bash
# Store listing + assets
npx sharp-cli -i assets/logo-icon.svg -o assets/logo-icon-128.png resize 128 128
npx sharp-cli -i assets/logo-icon.svg -o assets/logo-icon-512.png resize 512 512
npx sharp-cli -i assets/logo-mark.svg -o assets/logo-mark-512.png resize 512 512

# Chrome extension manifest icons
for size in 16 32 48 96 128; do
  npx sharp-cli -i assets/logo-icon.svg -o public/icon/${size}.png resize ${size} ${size}
done
```

- [ ] **Step 3: Verify the 16px and 32px icons**

Read `public/icon/16.png` and `public/icon/32.png`. Confirm the mark is recognizable at these sizes. If not, a simplified variant may be needed for the smallest sizes.

- [ ] **Step 4: Commit**

```bash
git add assets/logo-icon.svg assets/logo-mark.svg assets/icon.svg assets/icon-mark.svg assets/logo.svg
git add assets/logo-icon-128.png assets/logo-icon-512.png assets/logo-mark-512.png
git add public/icon/
git commit -m "brand: finalize logo mark and generate all icon sizes"
```

---

### Task 12: Wordmark Lockup

**Files:**
- Create: `assets/logo-wordmark.svg`

Create a horizontal lockup: mark + "chromewave" (or "Sampler" — per user choice from Figma phase). Uses the app's typeface Archivo.

- [ ] **Step 1: Create the wordmark SVG**

Create `assets/logo-wordmark.svg`. The mark sits on the left, the text sits to the right with defined spacing. Use `<text>` with `font-family="Archivo"` at a weight and size that balances with the mark.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64" fill="none">
  <!-- Mark (scaled to fit 64px height) — paste the final mark shapes here, scaled -->
  <!-- ... mark elements ... -->

  <!-- Wordmark -->
  <text x="80" y="40" font-family="Archivo, sans-serif" font-size="24"
        font-weight="600" fill="#eef5c5" letter-spacing="-0.02em">
    chromewave
  </text>
</svg>
```

The exact viewBox, mark scaling, text x-offset, and font-size depend on the final mark dimensions from Figma. Adjust to optically center the text vertically against the mark.

- [ ] **Step 2: Optimize with svgo**

```bash
npx svgo assets/logo-wordmark.svg -o assets/logo-wordmark.svg
```

- [ ] **Step 3: Commit**

```bash
git add assets/logo-wordmark.svg
git commit -m "brand: add wordmark lockup"
```

---

### Task 13: Brand Guidelines Document

**Files:**
- Create: `docs/brand-guidelines.md`

Write the usage guidelines covering mark variants, color usage, minimum size, clear space, and don'ts.

- [ ] **Step 1: Write the guidelines**

Create `docs/brand-guidelines.md`:

```markdown
# Chromewave Brand Guidelines

## Logo Variants

| Variant | File | Use when |
|---------|------|----------|
| Logo icon | `assets/logo-icon.svg` | App icon, store listing, anywhere a square icon with background is needed |
| Logo mark | `assets/logo-mark.svg` | On dark backgrounds where the squircle is redundant |
| Icon | `assets/icon.svg` | Chrome extension manifest icon |
| Wordmark lockup | `assets/logo-wordmark.svg` | Marketing, headers, anywhere the name needs to appear alongside the mark |

## Colors

The mark is monochromatic: **#eef5c5** (`cw-primary`) on **#161818** (`cw-surface`).

| Context | Mark color | Background |
|---------|-----------|------------|
| Standard (dark bg) | #eef5c5 | #161818 squircle or transparent |
| Light bg fallback | #161818 | transparent or light surface |
| Monochrome | white or black | any |

**Never use pink (#ffb3c3) in the logo.** Pink is reserved for semantic attention states in the UI.

## Minimum Size

The mark must not be displayed smaller than **16×16px**. Below this size, details collapse and the mark becomes unrecognizable.

| Size | Context |
|------|---------|
| 16px | Chrome toolbar — minimum usable size |
| 32px | Extensions page — details emerge |
| 48px | Primary extension icon |
| 128px | Store listing |
| 512px | Marketing materials |

## Clear Space

Maintain a minimum clear space equal to **25% of the mark height** on all sides. No other graphic elements, text, or edges should encroach on this space.

## Don'ts

- Do not apply gradients, shadows, or glows
- Do not rotate or skew the mark
- Do not stretch or distort proportions
- Do not change the mark color to pink, green, or any non-approved color
- Do not add outlines or strokes to the mark
- Do not place the mark on busy or low-contrast backgrounds
- Do not recreate or approximate the mark — always use the provided SVG assets
```

- [ ] **Step 2: Commit**

```bash
git add docs/brand-guidelines.md
git commit -m "docs: add brand guidelines"
```

---

### Task 14: Final Cleanup

- [ ] **Step 1: Verify all assets exist**

```bash
echo "=== SVG assets ==="
ls -la assets/logo-icon.svg assets/logo-mark.svg assets/icon.svg assets/icon-mark.svg assets/logo.svg assets/logo-wordmark.svg

echo "=== PNG assets ==="
ls -la assets/logo-icon-128.png assets/logo-icon-512.png assets/logo-mark-512.png

echo "=== Extension icons ==="
ls -la public/icon/

echo "=== Docs ==="
ls -la docs/brand-research.md docs/brand-guidelines.md
```

All files should exist and have non-zero sizes.

- [ ] **Step 2: Remove concept working files (optional)**

If the concept exploration files are no longer needed:

```bash
rm -rf assets/concepts/
git add -u assets/concepts/
git commit -m "brand: remove concept exploration files"
```

Or keep them for historical reference — user's choice.

- [ ] **Step 3: Final commit**

```bash
git add -A
git status
# Verify no unexpected files are staged
git commit -m "brand: complete chromewave brand system"
```
