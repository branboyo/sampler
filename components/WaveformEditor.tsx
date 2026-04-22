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
  zoomMode: 'bubble' | 'inline';
  onTrimChange: (start: number, end: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onApplyTrim?: (newBuffer: AudioBuffer) => void;
}

// ── Zoom state ────────────────────────────────────────────────────────────────

interface ZoomState {
  trigger: 'canvas' | 'start' | 'end';
  centerSec: number;
  anchorPct: number; // 0–1: bubble's left position (clamped to keep it on-screen)
}

// ── Mini-waveform renderer ────────────────────────────────────────────────────
// Draws the ±windowSec slice of `buffer` centred on `centerSec`.
// A cyan centre line marks the handle / cursor position exactly.

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

  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  const sr = buffer.sampleRate;
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;

  const startSample = Math.max(0, Math.round((centerSec - windowSec / 2) * sr));
  const endSample = Math.min(buffer.length, Math.round((centerSec + windowSec / 2) * sr));
  const totalSamples = endSample - startSample;
  if (totalSamples <= 0) return;

  // Normalise to the local peak so quiet sections are still readable
  let peak = 0;
  for (let s = startSample; s < endSample; s++) {
    const a = ch1
      ? Math.max(Math.abs(ch0[s] ?? 0), Math.abs(ch1[s] ?? 0))
      : Math.abs(ch0[s] ?? 0);
    if (a > peak) peak = a;
  }
  const norm = peak > 0.001 ? 1 / peak : 1;

  const barW = 2 * dpr;
  const gap = 1 * dpr;
  const numBars = Math.floor(W / (barW + gap));

  for (let i = 0; i < numBars; i++) {
    const sStart = startSample + Math.floor((i / numBars) * totalSamples);
    const sEnd = startSample + Math.floor(((i + 1) / numBars) * totalSamples);
    let maxAmp = 0;
    for (let s = sStart; s < sEnd; s++) {
      const a = ch1
        ? Math.max(Math.abs(ch0[s] ?? 0), Math.abs(ch1[s] ?? 0))
        : Math.abs(ch0[s] ?? 0);
      if (a > maxAmp) maxAmp = a;
    }
    const barH = Math.max(2 * dpr, maxAmp * norm * H * 0.85);
    const x = i * (barW + gap);
    const y = (H - barH) / 2;
    ctx.fillStyle = 'rgba(110,113,145,0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, dpr);
    ctx.fill();
  }

  // Centre marker — exact handle / cursor position
  ctx.fillStyle = 'rgba(103,232,249,0.9)';
  ctx.fillRect(W / 2 - dpr, 0, dpr * 2, H);
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
          className="w-[72px] rounded border border-cw-action-bold/60 bg-cw-elevated px-1 text-center font-mono text-[10px] text-cw-timestamp outline-none"
        />
      ) : (
        <span
          className="cursor-text font-mono text-[10px] text-cw-timestamp hover:text-cw-action"
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
  zoomMode,
  onTrimChange,
  onPlayingChange,
  onApplyTrim,
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
  useEffect(() => { onTrimChangeRef.current = onTrimChange; }, [onTrimChange]);
  useEffect(() => { onPlayingChangeRef.current = onPlayingChange; }, [onPlayingChange]);
  useEffect(() => { onApplyTrimRef.current = onApplyTrim; }, [onApplyTrim]);

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
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTriggerRef = useRef<'canvas' | 'start' | 'end' | null>(null);
  const holdOriginRef = useRef<{ x: number; y: number } | null>(null);
  const zoomActiveRef = useRef(false);

  // Callback ref: draw as soon as the canvas mounts
  const zoomCanvasCallbackRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      zoomCanvasRef.current = canvas;
      if (canvas && zoomState && audioBufferRef.current) {
        requestAnimationFrame(() => {
          if (zoomCanvasRef.current && zoomState && audioBufferRef.current) {
            drawMiniWave(zoomCanvasRef.current, audioBufferRef.current, zoomState.centerSec);
          }
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zoomState?.trigger, zoomState?.centerSec],
  );

  // Redraw whenever centre moves (handle drag / canvas follow)
  useEffect(() => {
    if (!zoomState || !audioBufferRef.current || !zoomCanvasRef.current) return;
    drawMiniWave(zoomCanvasRef.current, audioBufferRef.current, zoomState.centerSec);
  }, [zoomState?.centerSec]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Container pointer events ────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const HOLD_MS = 500;
    const HANDLE_HIT_PX = 16;
    const CANVAS_CANCEL_PX = 8;

    const cancelHold = () => {
      if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    };

    const closeZoom = () => {
      cancelHold();
      if (zoomActiveRef.current) {
        zoomActiveRef.current = false;
        holdTriggerRef.current = null;
        holdOriginRef.current = null;
        setZoomState(null);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const ws = wavesurferRef.current;
      const region = regionRef.current;
      if (!ws || !region) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const w = rect.width;
      const dur = ws.getDuration();
      if (dur <= 0 || w <= 0) return;

      const startPx = (region.start / dur) * w;
      const endPx = (region.end / dur) * w;

      let trigger: 'canvas' | 'start' | 'end';
      let centerSec: number;

      if (Math.abs(x - startPx) <= HANDLE_HIT_PX) {
        trigger = 'start'; centerSec = region.start;
      } else if (Math.abs(x - endPx) <= HANDLE_HIT_PX) {
        trigger = 'end'; centerSec = region.end;
      } else {
        trigger = 'canvas'; centerSec = Math.max(0, Math.min(dur, (x / w) * dur));
      }

      holdTriggerRef.current = trigger;
      holdOriginRef.current = { x, y };
      cancelHold();

      const anchorPct = Math.max(0.1, Math.min(0.9, x / w));
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        zoomActiveRef.current = true;
        setZoomState({ trigger, centerSec, anchorPct });
      }, HOLD_MS);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!zoomActiveRef.current) {
        // Cancel canvas hold if pointer moved too far before timer fires
        if (holdTimerRef.current && holdTriggerRef.current === 'canvas' && holdOriginRef.current) {
          const rect = container.getBoundingClientRect();
          const dx = (e.clientX - rect.left) - holdOriginRef.current.x;
          const dy = (e.clientY - rect.top) - holdOriginRef.current.y;
          if (Math.sqrt(dx * dx + dy * dy) > CANVAS_CANCEL_PX) cancelHold();
        }
        return;
      }

      // Canvas hold: zoom view follows the pointer
      if (holdTriggerRef.current === 'canvas') {
        const ws = wavesurferRef.current;
        if (!ws) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const w = rect.width;
        const dur = ws.getDuration();
        if (dur <= 0 || w <= 0) return;
        const sec = Math.max(0, Math.min(dur, (x / w) * dur));
        const anchorPct = Math.max(0.1, Math.min(0.9, x / w));
        setZoomState((prev) => prev ? { ...prev, centerSec: sec, anchorPct } : null);
      }
      // Handle triggers: centerSec updated via region 'update' event below
    };

    const onPointerUp = () => closeZoom();
    const onPointerLeave = () => closeZoom();

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointerleave', onPointerLeave);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
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
      if (ws.getCurrentTime() >= region.end) {
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

      // Update zoom centre when a handle is being dragged
      if (zoomActiveRef.current && holdTriggerRef.current !== 'canvas') {
        const newCenter = holdTriggerRef.current === 'start' ? region.start : region.end;
        const anchorPct = Math.max(0.1, Math.min(0.9, newCenter / buffer.duration));
        setZoomState((prev) => prev ? { ...prev, centerSec: newCenter, anchorPct } : null);
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

      // Reset playback cursor to new trim start.
      // If playing: pause without triggering loop logic, seek, then restart.
      // If paused: just seek so the next Play begins from trim start.
      const ws = wavesurferRef.current;
      if (ws && ws.getDuration() > 0) {
        const wasPlaying = ws.isPlaying();
        if (wasPlaying) {
          programmaticPauseRef.current = true;
          ws.pause();
          programmaticPauseRef.current = false;
        }
        ws.seekTo(region.start / ws.getDuration());
        if (wasPlaying) {
          region.play();
          startLoopRaf();
        }
      }

      // Close zoom when the handle is released
      if (zoomActiveRef.current && holdTriggerRef.current !== 'canvas') {
        zoomActiveRef.current = false;
        holdTriggerRef.current = null;
        holdOriginRef.current = null;
        setZoomState(null);
      }
    });
  }, [stopScrub, startLoopRaf]);

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
      color: 'rgba(103, 232, 249, 0.08)',
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
      h.style.background = 'rgba(103, 232, 249, 0.65)';
      h.style.boxShadow = '0 0 6px rgba(103, 232, 249, 0.45)';
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
        waveColor: 'rgba(110, 113, 145, 0.3)',
        progressColor: '#6366f1',
        cursorColor: '#ffffff',
        cursorWidth: 2,
        barWidth: 3,
        barGap: 1,
        barRadius: 1,
        height: 80,
        normalize: true,
        // interact: true (default) so play(0, end) isn't blocked when trimStart=0.
        // User click-to-seek is intercepted and clamped below via 'interaction'.
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
        addRegion(trimStart, trimEnd, regions, ws, audioBuffer);
      });

      // Clamp any user click-to-seek to within the trim region.
      // A programmaticSeek flag breaks the feedback loop caused by
      // ws.setTime() itself emitting 'interaction'.
      let programmaticSeek = false;
      ws.on('interaction', (newTime: number) => {
        if (programmaticSeek) return;
        const region = regionRef.current;
        if (!region) return;
        if (newTime < region.start || newTime > region.end) {
          programmaticSeek = true;
          ws.setTime(region.start);
          programmaticSeek = false;
        }
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

      const unsub = ws.on('ready', () => {
        // Self-unsubscribe: removes this listener from WaveSurfer so it fires
        // exactly once. Nulling the ref alone wasn't enough — the old listener
        // stayed registered and fired again on the next loadBlob call.
        readyUnsubRef.current?.();
        readyUnsubRef.current = null;
        const clampedEnd = Math.min(savedEnd, ws.getDuration());
        addRegion(savedStart, clampedEnd, regions, ws, audioBuffer);
        setIsUpdating(false);
        if (clampedEnd !== savedEnd) onTrimChangeRef.current(savedStart, clampedEnd);
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
      if (region) { region.play(); startLoopRaf(); }
      else ws.play();
    } else if (!isPlaying && ws.isPlaying()) {
      stopLoopRaf();
      ws.pause();
      if (ws.getDuration() > 0 && region) ws.seekTo(region.start / ws.getDuration());
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

  return (
    <div data-testid="waveform-editor" className="px-4 pt-2 pb-1">
      {/* Waveform + bubble anchor */}
      <div className="relative">
        {/* Option A: Floating bubble */}
        {zoomMode === 'bubble' && zoomState && (
          <div
            className="pointer-events-none absolute z-30 w-52 -translate-x-1/2 rounded-xl border border-cw-action-bold bg-cw-elevated p-2 shadow-xl shadow-black/40"
            style={{ bottom: 'calc(100% + 14px)', left: `${zoomState.anchorPct * 100}%` }}
          >
            {/* Caret */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-t-cw-action-bold" />
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider text-cw-action">Magnified</span>
              {zoomLabel && (
                <span className="font-mono text-[9px] text-cw-text-secondary">{zoomLabel}</span>
              )}
              <span className="font-mono text-[9px] text-cw-text-secondary">8×</span>
            </div>
            <canvas
              ref={zoomCanvasCallbackRef}
              height={50}
              className="block w-full rounded bg-[#0d0f1e]"
            />
            <div className="mt-1 text-center font-mono text-[9px] text-cw-timestamp">
              {formatTime(zoomState.centerSec)}
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="overflow-hidden rounded-lg bg-cw-surface transition-opacity duration-200"
          style={{ minHeight: '80px', opacity: isUpdating ? 0.45 : 1 }}
        />
      </div>

      {/* Trim time labels — outer div always rendered to hold its h-5 height */}
      <div className="relative mt-1 h-5">
        {ready && (labelsCollide ? (
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
        ))}
      </div>

      {/* Apply trim button — wrapper always rendered to reserve its height */}
      {onApplyTrim && (
        <div className="mt-1.5 flex min-h-[22px] justify-center">
          {ready && (displayEnd - displayStart) < (duration - 0.001) && (
            <button
              onClick={handleApplyTrim}
              title="Replace audio with the trimmed region"
              className="flex items-center gap-1 rounded px-2.5 py-0.5 text-[10px] text-cw-action ring-1 ring-cw-action/30 transition-colors hover:bg-cw-action/10 hover:ring-cw-action/60 active:bg-cw-action/20"
            >
              <span aria-hidden>✂</span>
              Apply trim
            </button>
          )}
        </div>
      )}

      {/* Option B: Inline zoom panel */}
      {zoomMode === 'inline' && zoomState && (
        <div className="mt-2 overflow-hidden rounded-lg border border-cw-action-bold bg-[#0d0f1e]">
          <div className="flex items-center justify-between border-b border-cw-action-bold/20 bg-cw-action-bold/[0.07] px-2 py-1">
            <span className="text-[9px] uppercase tracking-wider text-cw-action">Magnified · 8×</span>
            {zoomLabel && (
              <span className="text-[9px] text-cw-text-secondary">{zoomLabel}</span>
            )}
            <span className="font-mono text-[9px] text-cw-timestamp">
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
    </div>
  );
}
