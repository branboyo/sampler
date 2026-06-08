import { useRef, useEffect, useCallback, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

interface WaveformEditorProps {
  audioBuffer: AudioBuffer | null;
  /** Changes only when the underlying source recording changes (not on FX updates). */
  sourceKey: string;
  trimStart: number;
  trimEnd: number;
  isPlaying: boolean;
  onTrimChange: (start: number, end: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onApplyTrim?: (newBuffer: AudioBuffer) => void;
  onTimeUpdate?: (time: number) => void;
  onZoomChange?: (active: boolean) => void;
}

// ── Zoom state ────────────────────────────────────────────────────────────────

interface ZoomState {
  trigger: 'canvas' | 'start' | 'end';
  centerSec: number;
}

// ── Mini-waveform renderer ────────────────────────────────────────────────────
// Draws the ±windowSec slice of `buffer` centred on `centerSec`.
// A cyan centre line marks the handle / cursor position exactly.

// ── Global peak cache ────────────────────────────────────────────────────────
// Keyed by buffer reference — recomputed only when the AudioBuffer changes.
const peakCache = new WeakMap<AudioBuffer, number>();

function getGlobalPeak(buffer: AudioBuffer): number {
  const cached = peakCache.get(buffer);
  if (cached !== undefined) return cached;
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  let peak = 0;
  for (let s = 0; s < buffer.length; s++) {
    const a = ch1
      ? Math.max(Math.abs(ch0[s]), Math.abs(ch1[s]))
      : Math.abs(ch0[s]);
    if (a > peak) peak = a;
  }
  peakCache.set(buffer, peak);
  return peak;
}

// ── Magnification renderer ───────────────────────────────────────────────────
// Fixed-grid approach: bars are anchored to absolute audio-time positions and
// scroll sub-pixel as the window moves, eliminating jitter from sample aliasing
// and rescaling.

function drawMiniWave(
  canvas: HTMLCanvasElement,
  buffer: AudioBuffer,
  centerSec: number,
  windowSec = 0.5,
) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight || 50;
  if (cssW === 0) return;

  // Only resize when dimensions change — resetting canvas.width/height clears
  // the GPU buffer and causes a visible blank-frame flash (flicker).
  const targetW = Math.round(cssW * dpr);
  const targetH = Math.round(cssH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  const sr = buffer.sampleRate;
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  const dur = buffer.length / sr;

  // ── Window bounds (constant width, slides at edges) ──────────────────────
  let winStart = centerSec - windowSec / 2;
  let winEnd = centerSec + windowSec / 2;
  if (winStart < 0) { winStart = 0; winEnd = Math.min(windowSec, dur); }
  if (winEnd > dur) { winEnd = dur; winStart = Math.max(0, dur - windowSec); }
  if (winEnd <= winStart) return;

  // ── Global normalization — no amplitude jitter ───────────────────────────
  const globalPeak = getGlobalPeak(buffer);
  const norm = globalPeak > 0.001 ? 1 / globalPeak : 1;

  // ── Fixed-grid bars ──────────────────────────────────────────────────────
  // Each bar represents a fixed duration of audio. As the center moves, bars
  // shift sub-pixel (like a scrolling filmstrip) rather than having their
  // sample mappings realign to pixel boundaries.
  const barW = 2 * dpr;
  const gap = 1 * dpr;
  const step = barW + gap;
  const numBars = Math.ceil(W / step) + 1; // +1 for partial bar at edges
  const barDuration = windowSec / (W / step); // seconds per bar

  // Anchor the grid to time=0 so bar boundaries are always at the same audio
  // positions regardless of where the window is.
  const gridOffset = winStart % barDuration;
  const firstBarTime = winStart - gridOffset;

  for (let i = 0; i < numBars; i++) {
    const barTime = firstBarTime + i * barDuration;
    if (barTime + barDuration <= 0 || barTime >= dur) continue;

    // Pixel position (sub-pixel for smooth scrolling)
    const x = (barTime - winStart) / (winEnd - winStart) * W;
    if (x + barW < 0 || x > W) continue;

    // Sample range for this bar
    const sStart = Math.max(0, Math.round(barTime * sr));
    const sEnd = Math.min(buffer.length, Math.round((barTime + barDuration) * sr));
    if (sEnd <= sStart) continue;

    // Peak amplitude in this bar's sample range
    let maxAmp = 0;
    for (let s = sStart; s < sEnd; s++) {
      const a = ch1
        ? Math.max(Math.abs(ch0[s]), Math.abs(ch1[s]))
        : Math.abs(ch0[s]);
      if (a > maxAmp) maxAmp = a;
    }

    const barH = Math.max(2 * dpr, maxAmp * norm * H * 0.85);
    const y = (H - barH) / 2;
    ctx.fillStyle = 'rgba(245,250,217,0.4)';
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, dpr);
    ctx.fill();
  }

  // ── Centre marker ────────────────────────────────────────────────────────
  const markerFrac = (centerSec - winStart) / (winEnd - winStart);
  const markerX = markerFrac * W;
  ctx.fillStyle = 'rgba(238,245,197,0.9)';
  ctx.fillRect(markerX - dpr, 0, dpr * 2, H);
}

// ── Time format (ms precision) ────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3);
  return `${m}:${s.padStart(6, '0')}`;
}

// ── Editable trim-time label ──────────────────────────────────────────────────

interface EditableTrimTimeProps {
  value: number;
  min: number;
  max: number;
  style: React.CSSProperties;
  /** 'start' = left edge anchored at position (label extends right).
   *  'end'   = right edge anchored at position (label extends left). */
  anchor: 'start' | 'end';
  onCommit: (v: number) => void;
}

function EditableTrimTime({ value, min, max, style, anchor, onCommit }: EditableTrimTimeProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => { setDraft(value.toFixed(3)); setEditing(true); };

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) onCommit(Math.max(min, Math.min(max, parsed)));
    setEditing(false);
  };

  // anchor='start' → left edge at handle, text extends rightward (no X shift)
  // anchor='end'   → right edge at handle, text extends leftward (-100% shift)
  const transform = anchor === 'end' ? 'translateX(-100%)' : undefined;

  return (
    <div className="absolute" style={{ ...style, transform }}>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-[72px] rounded border border-cw-primary/60 bg-cw-surface px-1 text-center text-[10px] text-cw-text-muted [font-variant-numeric:tabular-nums] outline-none"
        />
      ) : (
        <span
          className="cursor-text text-[10px] text-cw-text-muted [font-variant-numeric:tabular-nums] hover:text-cw-primary"
          title="Click to enter exact time (seconds)"
          onClick={startEdit}
        >
          {formatTime(value)}
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WaveformEditor({
  audioBuffer,
  sourceKey,
  trimStart,
  trimEnd,
  isPlaying,
  onTrimChange,
  onPlayingChange,
  onApplyTrim,
  onTimeUpdate,
  onZoomChange,
}: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const regionRef = useRef<ReturnType<RegionsPlugin['addRegion']> | null>(null);
  const scrubCtxRef = useRef<AudioContext | null>(null);
  const scrubSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lastScrubTimeRef = useRef(0);
  const prevSourceKeyRef = useRef<string | null>(null);
  const prevStartRef = useRef(trimStart);
  const prevEndRef = useRef(trimEnd);
  // Holds the unsubscribe fn returned by ws.on('ready', ...) during soft reloads,
  // so we can cancel a pending listener before adding a new one.
  const readyUnsubRef = useRef<(() => void) | null>(null);

  // Keep latest callbacks in refs so async event handlers never go stale
  const onTrimChangeRef = useRef(onTrimChange);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onApplyTrimRef = useRef(onApplyTrim);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onZoomChangeRef = useRef(onZoomChange);
  useEffect(() => { onTrimChangeRef.current = onTrimChange; }, [onTrimChange]);
  useEffect(() => { onPlayingChangeRef.current = onPlayingChange; }, [onPlayingChange]);
  useEffect(() => { onApplyTrimRef.current = onApplyTrim; }, [onApplyTrim]);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);
  useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);

  // Mirror isPlaying prop in a ref so WaveSurfer event handlers can read it
  // without capturing a stale closure value.
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Set to true before a programmatic ws.pause() to prevent the 'pause' handler
  // from treating it as a user-initiated stop or triggering the loop logic.
  const programmaticPauseRef = useRef(false);

  // rAF handle for the loop-boundary polling loop. null when not running.
  const loopRafRef = useRef<number | null>(null);

  // Latest audioBuffer in a ref for pointer-event handlers
  const audioBufferRef = useRef(audioBuffer);
  useEffect(() => { audioBufferRef.current = audioBuffer; }, [audioBuffer]);

  const [ready, setReady] = useState(false);
  // True only during FX soft-reloads — dims the waveform but does NOT collapse
  // layout (no setReady(false)), preventing the height-shift jitter.
  const [isUpdating, setIsUpdating] = useState(false);
  const [displayStart, setDisplayStart] = useState(trimStart);
  const [displayEnd, setDisplayEnd] = useState(trimEnd);

  useEffect(() => {
    setDisplayStart(trimStart);
    setDisplayEnd(trimEnd);
  }, [trimStart, trimEnd]);

  // ── Zoom state ──────────────────────────────────────────────────────────────

  const [zoomState, setZoomState] = useState<ZoomState | null>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const holdTriggerRef = useRef<'canvas' | 'start' | 'end' | null>(null);
  const zoomActiveRef = useRef(false);
  const cursorDragRef = useRef(false);

  // Notify parent when magnification activates/deactivates
  useEffect(() => {
    onZoomChangeRef.current?.(zoomState !== null);
  }, [zoomState !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Callback ref: only stores the canvas element. Stable function — never
  // causes React to detach/reattach (which would fire extra rAF draws).
  const zoomCanvasCallbackRef = useCallback((canvas: HTMLCanvasElement | null) => {
    zoomCanvasRef.current = canvas;
  }, []);

  // Single draw path: redraws whenever centerSec changes or canvas mounts.
  useEffect(() => {
    if (!zoomState || !audioBufferRef.current || !zoomCanvasRef.current) return;
    drawMiniWave(zoomCanvasRef.current, audioBufferRef.current, zoomState.centerSec);
  }, [zoomState?.centerSec, zoomState?.trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Container pointer events ────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const HANDLE_HIT_PX = 16;

    const closeZoom = () => {
      holdTriggerRef.current = null;
      if (zoomActiveRef.current) {
        zoomActiveRef.current = false;
        setZoomState(null);
      }
    };

    const seekToPointer = (e: PointerEvent) => {
      const ws = wavesurferRef.current;
      const region = regionRef.current;
      if (!ws || !region) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const w = rect.width;
      const dur = ws.getDuration();
      if (dur <= 0 || w <= 0) return;
      const time = Math.max(region.start, Math.min(region.end, (x / w) * dur));
      ws.seekTo(time / dur);
      onTimeUpdateRef.current?.(time);
    };

    const onPointerDown = (e: PointerEvent) => {
      const ws = wavesurferRef.current;
      const region = regionRef.current;
      if (!ws || !region) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const w = rect.width;
      const dur = ws.getDuration();
      if (dur <= 0 || w <= 0) return;

      const startPx = (region.start / dur) * w;
      const endPx = (region.end / dur) * w;

      let trigger: 'canvas' | 'start' | 'end';

      if (Math.abs(x - startPx) <= HANDLE_HIT_PX) {
        trigger = 'start';
      } else if (Math.abs(x - endPx) <= HANDLE_HIT_PX) {
        trigger = 'end';
      } else {
        trigger = 'canvas';
      }

      holdTriggerRef.current = trigger;

      if (trigger === 'canvas') {
        e.stopPropagation();
        e.preventDefault();
        container.setPointerCapture(e.pointerId);
        cursorDragRef.current = true;
        seekToPointer(e);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const isHandleDrag = holdTriggerRef.current === 'start' || holdTriggerRef.current === 'end';
      if (!cursorDragRef.current && !isHandleDrag) return;
      if (cursorDragRef.current) seekToPointer(e);

      const ws = wavesurferRef.current;
      if (!ws) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const w = rect.width;
      const dur = ws.getDuration();
      if (dur <= 0 || w <= 0) return;
      const sec = Math.max(0, Math.min(dur, (x / w) * dur));
      const trigger = holdTriggerRef.current ?? 'canvas';

      if (!zoomActiveRef.current) {
        zoomActiveRef.current = true;
        setZoomState({ trigger, centerSec: sec });
      } else {
        setZoomState((prev) => prev ? { ...prev, centerSec: sec } : null);
      }
    };

    const onPointerUp = () => {
      cursorDragRef.current = false;
      closeZoom();
    };
    const onPointerLeave = () => {
      if (!cursorDragRef.current && !holdTriggerRef.current) closeZoom();
    };

    container.addEventListener('pointerdown', onPointerDown, true);
    container.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointerleave', onPointerLeave);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown, true);
      container.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const bufferToWav = useCallback((buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const headerSize = 44;
    const arrayBuf = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(arrayBuf);
    const writeStr = (off: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, headerSize + dataSize - 8, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch));
    let offset = headerSize;
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const s = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += bytesPerSample;
      }
    }
    return new Blob([arrayBuf], { type: 'audio/wav' });
  }, []);

  const stopScrub = useCallback(() => {
    if (scrubSourceRef.current) {
      try { scrubSourceRef.current.stop(); } catch { /* already stopped */ }
      scrubSourceRef.current = null;
    }
  }, []);

  const stopLoopRaf = useCallback(() => {
    if (loopRafRef.current !== null) {
      cancelAnimationFrame(loopRafRef.current);
      loopRafRef.current = null;
    }
  }, []);

  const startLoopRaf = useCallback(() => {
    if (loopRafRef.current !== null) cancelAnimationFrame(loopRafRef.current);
    const tick = () => {
      const ws = wavesurferRef.current;
      const region = regionRef.current;
      if (!ws || !region || !ws.isPlaying()) {
        loopRafRef.current = null;
        return;
      }
      const currentTime = ws.getCurrentTime();
      onTimeUpdateRef.current?.(currentTime);
      if (currentTime >= region.end) {
        ws.setTime(region.start);
      }
      loopRafRef.current = requestAnimationFrame(tick);
    };
    loopRafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleApplyTrim = useCallback(() => {
    const buf = audioBufferRef.current;
    const region = regionRef.current;
    if (!buf || !region) return;
    const { start, end } = region;
    if (end - start < 0.001) return;
    const sr = buf.sampleRate;
    const startSample = Math.round(start * sr);
    const endSample = Math.round(end * sr);
    const length = endSample - startSample;
    if (length <= 0) return;
    const trimmed = new AudioBuffer({ length, sampleRate: sr, numberOfChannels: buf.numberOfChannels });
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      trimmed.copyToChannel(buf.getChannelData(ch).slice(startSample, endSample), ch);
    }
    onApplyTrimRef.current?.(trimmed);
  }, []);

  const decorateCursor = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // WaveSurfer creates a child div and attaches its shadow root there
    const wsDiv = el.firstElementChild as HTMLElement | null;
    const shadow = wsDiv?.shadowRoot;
    if (!shadow) return;
    const cursor = shadow.querySelector('.cursor') as HTMLElement | null;
    if (!cursor || cursor.dataset.decorated) return;
    cursor.dataset.decorated = 'true';
    cursor.style.overflow = 'visible';
    cursor.style.zIndex = '10';

    const makeTriangle = (side: 'top' | 'bottom') => {
      const tri = document.createElement('div');
      Object.assign(tri.style, {
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '0',
        height: '0',
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        pointerEvents: 'none',
      });
      if (side === 'top') {
        tri.style.top = '0';
        tri.style.borderTop = '5px solid #ffb3c3';
      } else {
        tri.style.bottom = '0';
        tri.style.borderBottom = '5px solid #ffb3c3';
      }
      return tri;
    };

    cursor.appendChild(makeTriangle('top'));
    cursor.appendChild(makeTriangle('bottom'));
  }, []);

  const wireRegionEvents = useCallback((
    region: ReturnType<RegionsPlugin['addRegion']>,
    buffer: AudioBuffer,
  ) => {
    prevStartRef.current = region.start;
    prevEndRef.current = region.end;

    region.on('update', () => {
      setDisplayStart(region.start);
      setDisplayEnd(region.end);

      const startMoved = Math.abs(region.start - prevStartRef.current) > 0.001;
      const endMoved = Math.abs(region.end - prevEndRef.current) > 0.001;
      if (!startMoved && !endMoved) return;

      const scrubTime = endMoved ? region.end : region.start;
      prevStartRef.current = region.start;
      prevEndRef.current = region.end;

      // Clamp playhead to stay within the trim region during drag
      const ws = wavesurferRef.current;
      if (ws && ws.getDuration() > 0) {
        const t = ws.getCurrentTime();
        if (t < region.start) {
          ws.seekTo(region.start / ws.getDuration());
          onTimeUpdateRef.current?.(region.start);
        } else if (t > region.end) {
          ws.seekTo(region.end / ws.getDuration());
          onTimeUpdateRef.current?.(region.end);
        }
      }

      // Activate zoom on first handle movement (center tracking is handled by onPointerMove)
      if (!zoomActiveRef.current && (holdTriggerRef.current === 'start' || holdTriggerRef.current === 'end')) {
        zoomActiveRef.current = true;
        const initialCenter = holdTriggerRef.current === 'start' ? region.start : region.end;
        setZoomState({ trigger: holdTriggerRef.current, centerSec: initialCenter });
      }

      const now = performance.now();
      if (now - lastScrubTimeRef.current < 80) return;
      lastScrubTimeRef.current = now;

      stopScrub();
      if (!scrubCtxRef.current || scrubCtxRef.current.state === 'closed') {
        scrubCtxRef.current = new AudioContext();
      }
      const ctx = scrubCtxRef.current;
      const snippetLen = 0.08;
      const offset = Math.max(0, Math.min(scrubTime, buffer.duration - snippetLen));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + snippetLen);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0, offset, snippetLen);
      scrubSourceRef.current = source;
    });

    region.on('update-end', () => {
      stopScrub();
      setDisplayStart(region.start);
      setDisplayEnd(region.end);
      onTrimChangeRef.current(region.start, region.end);

      // Clamp playhead to stay within the trim region
      const ws = wavesurferRef.current;
      if (ws && ws.getDuration() > 0) {
        const t = ws.getCurrentTime();
        if (t < region.start) {
          ws.seekTo(region.start / ws.getDuration());
          onTimeUpdateRef.current?.(region.start);
        } else if (t > region.end) {
          ws.seekTo(region.end / ws.getDuration());
          onTimeUpdateRef.current?.(region.end);
        }
      }

      // Close zoom when the handle is released
      if (zoomActiveRef.current && holdTriggerRef.current !== 'canvas') {
        zoomActiveRef.current = false;
        holdTriggerRef.current = null;
        setZoomState(null);
      }
    });
  }, [stopScrub]);

  const addRegion = useCallback((
    start: number,
    end: number,
    regions: RegionsPlugin,
    ws: WaveSurfer,
    buffer: AudioBuffer,
  ) => {
    const clampedEnd = Math.min(end, ws.getDuration());
    const region = regions.addRegion({
      start,
      end: clampedEnd,
      color: 'rgba(238, 245, 197, 0.08)',
      drag: false,
      resize: true,
    });
    regionRef.current = region;
    setDisplayStart(start);
    setDisplayEnd(clampedEnd);
    wireRegionEvents(region, buffer);

    // ── Style trim handles ──────────────────────────────────────────────────────
    for (const side of ['left', 'right'] as const) {
      if (!region.element) continue;
      const h = region.element.querySelector(
        side === 'left'
          ? '[part*="region-handle-left"]'
          : '[part*="region-handle-right"]',
      ) as HTMLElement | null;
      if (!h) continue;

      // Thin track line
      h.style.width = '2px';
      h.style.background = 'rgba(238, 245, 197, 0.65)';
      h.style.boxShadow = 'none';
      h.style.cursor = 'default';
      if (side === 'left') h.style.borderLeft = 'none';
      else h.style.borderRight = 'none';

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
        background: 'rgba(238, 245, 197, 0.92)',
        boxShadow: 'none',
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
          background: 'rgba(15, 16, 16, 0.5)',
          borderRadius: '1px',
          pointerEvents: 'none',
          flexShrink: '0',
        });
        pill.appendChild(dash);
      }

      // Hover glow
      pill.addEventListener('pointerenter', () => {
        pill.style.background = 'rgba(238, 245, 197, 1)';
        pill.style.boxShadow = 'none';
      });
      pill.addEventListener('pointerleave', () => {
        pill.style.background = 'rgba(238, 245, 197, 0.92)';
        pill.style.boxShadow = 'none';
      });

      h.appendChild(pill);
    }

    return region;
  }, [wireRegionEvents]);

  // ── Main effect ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!containerRef.current || !audioBuffer) return;

    const isNewSource = sourceKey !== prevSourceKeyRef.current;
    const needsFullInit = isNewSource || !wavesurferRef.current;

    if (needsFullInit) {
      // Cancel any soft-reload ready listener that might still be pending
      readyUnsubRef.current?.();
      readyUnsubRef.current = null;

      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
        regionsRef.current = null;
        regionRef.current = null;
      }
      stopScrub();
      setReady(false);
      prevSourceKeyRef.current = sourceKey;

      const regions = RegionsPlugin.create();
      regionsRef.current = regions;

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: 'rgba(238, 245, 197, 0.3)',
        progressColor: '#eef5c5',
        cursorColor: '#ffb3c3',
        cursorWidth: 2,
        barWidth: 3,
        barGap: 1,
        barRadius: 1,
        height: 80,
        normalize: true,
        plugins: [regions],
      });
      wavesurferRef.current = ws;

      // Guard so this fires exactly once even though ws.on() is persistent.
      // Without this, every subsequent ws.loadBlob() (FX soft reloads) re-fires
      // the full-init listener, adding an extra region and resetting positions.
      let initFired = false;
      ws.on('ready', () => {
        if (initFired) return;
        initFired = true;
        setReady(true);
        decorateCursor();
        addRegion(trimStart, trimEnd, regions, ws, audioBuffer);
        onTimeUpdateRef.current?.(trimStart);
      });

      // Clamp any user click-to-seek to within the trim region.
      // A programmaticSeek flag breaks the feedback loop caused by
      // ws.setTime() itself emitting 'interaction'.
      let programmaticSeek = false;
      ws.on('interaction', (newTime: number) => {
        if (programmaticSeek) return;
        const region = regionRef.current;
        if (!region) return;
        const clamped = Math.max(region.start, Math.min(region.end, newTime));
        if (Math.abs(clamped - newTime) > 0.001) {
          programmaticSeek = true;
          ws.setTime(clamped);
          programmaticSeek = false;
        }
        onTimeUpdateRef.current?.(clamped);
      });

      // 'pause' fires when region.play() hits region.end OR the user pauses.
      // If the rAF didn't win the race against WaveSurfer's timeupdate-based stop,
      // we land here: detect it by currentTime being at/near region.end and loop.
      ws.on('pause', () => {
        if (programmaticPauseRef.current) return;
        const region = regionRef.current;
        if (isPlayingRef.current && region && ws.getCurrentTime() >= region.end - 0.1) {
          region.play(); // fallback — slight gap if rAF lost the race
          startLoopRaf();
          return;
        }
        stopLoopRaf();
        onPlayingChangeRef.current(false);
      });

      // 'finish' fires when the file plays to its absolute end.
      ws.on('finish', () => {
        const region = regionRef.current;
        if (isPlayingRef.current && region) {
          region.play();
          startLoopRaf();
          return;
        }
        stopLoopRaf();
        onPlayingChangeRef.current(false);
      });

      ws.loadBlob(bufferToWav(audioBuffer));

    } else {
      const ws = wavesurferRef.current!;
      const regions = regionsRef.current!;

      const savedStart = regionRef.current?.start ?? trimStart;
      const savedEnd = regionRef.current?.end ?? trimEnd;
      const oldDuration = ws.getDuration();

      if (ws.isPlaying()) {
        ws.pause();
        onPlayingChangeRef.current(false);
      }

      // Cancel any previous pending ready listener before adding a new one —
      // otherwise each FX change stacks an extra listener and addRegion fires
      // once per accumulated listener, producing extra trim handles.
      readyUnsubRef.current?.();
      readyUnsubRef.current = null;

      // Clear ALL regions (clearRegions covers orphans the ref may have missed)
      regions.clearRegions();
      regionRef.current = null;
      // Use isUpdating (not setReady(false)) so the trim-label / apply-trim
      // containers keep their height — no layout shift while FX processes.
      setIsUpdating(true);

      console.log('[WaveformEditor] soft-reload: clearing regions, loading new blob', {
        savedStart, savedEnd, oldDuration, audioBufferDuration: audioBuffer?.duration,
      });

      const unsub = ws.on('ready', () => {
        // Self-unsubscribe: removes this listener from WaveSurfer so it fires
        // exactly once. Nulling the ref alone wasn't enough — the old listener
        // stayed registered and fired again on the next loadBlob call.
        readyUnsubRef.current?.();
        readyUnsubRef.current = null;
        const newDuration = ws.getDuration();
        const wasAtEnd = oldDuration > 0 && Math.abs(savedEnd - oldDuration) < 0.01;
        const snappedEnd = wasAtEnd ? newDuration : Math.min(savedEnd, newDuration);
        console.log('[WaveformEditor] soft-reload ready fired', {
          newDuration, wasAtEnd, snappedEnd,
          regionCount: regions.getRegions().length,
        });
        addRegion(savedStart, snappedEnd, regions, ws, audioBuffer);
        setIsUpdating(false);
        decorateCursor();
        onTimeUpdateRef.current?.(savedStart);
        if (snappedEnd !== savedEnd) onTrimChangeRef.current(savedStart, snappedEnd);
      });
      readyUnsubRef.current = unsub as unknown as () => void;

      ws.loadBlob(bufferToWav(audioBuffer));
    }
  }, [audioBuffer, sourceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Unmount cleanup ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopLoopRaf();
      wavesurferRef.current?.destroy();
      wavesurferRef.current = null;
      stopScrub();
      scrubCtxRef.current?.close();
      scrubCtxRef.current = null;
    };
  }, [stopLoopRaf, stopScrub]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync play/pause ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ws = wavesurferRef.current;
    const region = regionRef.current;
    if (!ws || !ready || isUpdating) return;

    if (isPlaying && !ws.isPlaying()) {
      ws.play();
      if (region) startLoopRaf();
    } else if (!isPlaying && ws.isPlaying()) {
      stopLoopRaf();
      ws.pause();
      onTimeUpdateRef.current?.(ws.getCurrentTime());
    }
  }, [isPlaying, ready, isUpdating, startLoopRaf, stopLoopRaf]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const duration = audioBuffer?.duration ?? 1;
  const startPct = (displayStart / duration) * 100; // % fallback when containerW not yet measured
  const endPct = (displayEnd / duration) * 100;     // % fallback when containerW not yet measured

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

  const zoomLabel = zoomState?.trigger === 'start'
    ? 'trim start'
    : zoomState?.trigger === 'end'
      ? 'trim end'
      : null;

  const showApplyTrim = !!(onApplyTrim && ready && (displayEnd - displayStart) < (duration - 0.001));

  return (
    <div data-testid="waveform-editor" className="mx-5 rounded-2xl border border-cw-border px-4 py-3 shadow-lg shadow-black/25" style={{ backgroundColor: '#1a1c1c' }}>
      {/* Waveform */}
      <div
        ref={containerRef}
        className="overflow-hidden rounded-[10px] bg-cw-bg transition-opacity duration-200"
        style={{ minHeight: '80px', opacity: isUpdating ? 0.45 : 1 }}
      />

      {/* Trim time labels — outer div always rendered to hold its h-4 height */}
      <div className="relative h-4">
        {ready && (labelsCollide ? (
          /* Handles close — show both times separated by a dash, centered between handles */
          <>
            <EditableTrimTime
              value={displayStart}
              min={0}
              max={displayEnd - 0.001}
              anchor="end"
              style={{ left: `${midLabelPx - 4}px` }}
              onCommit={(v) => {
                onTrimChangeRef.current(v, displayEnd);
                regionRef.current?.setOptions({ start: v });
              }}
            />
            <span
              className="absolute -translate-x-1/2 text-[10px] text-cw-text-muted select-none"
              style={{ left: `${midLabelPx}px` }}
            >
              –
            </span>
            <EditableTrimTime
              value={displayEnd}
              min={displayStart + 0.001}
              max={duration}
              anchor="start"
              style={{ left: `${midLabelPx + 4}px` }}
              onCommit={(v) => {
                onTrimChangeRef.current(displayStart, v);
                regionRef.current?.setOptions({ end: v });
              }}
            />
          </>
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
        ))}
      </div>

      {/* Inline magnification panel */}
      {zoomState && (
        <div className="mt-2 overflow-hidden rounded-lg border border-cw-primary bg-cw-bg">
          <div className="flex items-center justify-between border-b border-cw-primary/20 bg-cw-primary/[0.07] px-2 py-1">
            <span className="text-[9px] uppercase tracking-wider text-cw-primary">Magnified · 8×</span>
            {zoomLabel && (
              <span className="text-[9px] text-cw-text-muted">{zoomLabel}</span>
            )}
            <span className="text-[9px] text-cw-text-muted [font-variant-numeric:tabular-nums]">
              {formatTime(zoomState.centerSec)}
            </span>
          </div>
          <canvas
            ref={zoomCanvasCallbackRef}
            height={56}
            className="block w-full"
          />
        </div>
      )}

      {/* Apply trim button — only rendered when trim is active */}
      {showApplyTrim && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={handleApplyTrim}
            title="Replace audio with the trimmed region"
            className="flex items-center gap-1 rounded px-3 py-1 text-[10px] text-cw-primary ring-1 ring-cw-primary/30 transition-colors hover:bg-cw-primary/10 hover:ring-cw-primary/60 active:bg-cw-primary/20"
          >
            <span aria-hidden>✂</span>
            Apply trim
          </button>
        </div>
      )}
    </div>
  );
}
