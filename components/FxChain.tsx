import { useState, useRef, useCallback, useEffect } from 'react';
import type { FxChainItem, FxType, FxParams, DelayParams, ReverbParams, DistortionParams, EqParams, PitchParams } from '@/types';
import { FX_LABELS } from '@/lib/fx-chain';

interface FxChainProps {
  chain: FxChainItem[];
  isProcessing: boolean;
  onAdd: (type: FxType) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onUpdateParams: (id: string, partial: Partial<FxParams>) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

const ALL_FX_TYPES: FxType[] = ['delay', 'reverb', 'distortion', 'eq', 'reverse', 'pitch'];

// ── Slider ───────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: SliderProps) {
  // Local state keeps the thumb and readout in sync while dragging.
  // The parent's onChange (which triggers FX reprocessing) is only called on release.
  const [local, setLocal] = useState(value);

  // Sync back when the parent resets the value (e.g. new recording loaded)
  useEffect(() => { setLocal(value); }, [value]);

  const commit = (e: React.SyntheticEvent<HTMLInputElement>) =>
    onChange(Number((e.target as HTMLInputElement).value));

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] text-cw-text-secondary">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}  // live display only
        onPointerUp={commit}   // mouse / touch / stylus release → reprocess
        onKeyUp={commit}       // keyboard arrow keys release → reprocess
        onWheel={(e) => e.currentTarget.blur()}
        className="cw-slider flex-1"
      />
      <span className="w-10 shrink-0 text-right font-mono text-[10px] text-cw-timestamp">
        {local}{unit}
      </span>
    </div>
  );
}

// ── Param panels per FX type ─────────────────────────────────────────────────

function DelayPanel({ params, id, onUpdateParams }: {
  params: DelayParams;
  id: string;
  onUpdateParams: (id: string, p: Partial<FxParams>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
      <Slider label="Time" value={params.time} min={10} max={1000} unit="ms"
        onChange={(v) => onUpdateParams(id, { time: v })} />
      <Slider label="Feedback" value={params.feedback} min={0} max={100} unit="%"
        onChange={(v) => onUpdateParams(id, { feedback: v })} />
      <Slider label="Mix" value={params.mix} min={0} max={100} unit="%"
        onChange={(v) => onUpdateParams(id, { mix: v })} />
    </div>
  );
}

function ReverbPanel({ params, id, onUpdateParams }: {
  params: ReverbParams;
  id: string;
  onUpdateParams: (id: string, p: Partial<FxParams>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
      <Slider label="Room Size" value={params.roomSize} min={0} max={100} unit="%"
        onChange={(v) => onUpdateParams(id, { roomSize: v })} />
      <Slider label="Decay" value={params.decay} min={0} max={100} unit="%"
        onChange={(v) => onUpdateParams(id, { decay: v })} />
      <Slider label="Mix" value={params.mix} min={0} max={100} unit="%"
        onChange={(v) => onUpdateParams(id, { mix: v })} />
    </div>
  );
}

function DistortionPanel({ params, id, onUpdateParams }: {
  params: DistortionParams;
  id: string;
  onUpdateParams: (id: string, p: Partial<FxParams>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
      <Slider label="Drive" value={params.drive} min={0} max={100} unit="%"
        onChange={(v) => onUpdateParams(id, { drive: v })} />
      <Slider label="Tone" value={params.tone} min={-12} max={12} unit="dB"
        onChange={(v) => onUpdateParams(id, { tone: v })} />
      <Slider label="Mix" value={params.mix} min={0} max={100} unit="%"
        onChange={(v) => onUpdateParams(id, { mix: v })} />
    </div>
  );
}

function EqPanel({ params, id, onUpdateParams }: {
  params: EqParams;
  id: string;
  onUpdateParams: (id: string, p: Partial<FxParams>) => void;
}) {
  return (
    <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
      <Slider label="Low (200Hz)" value={params.low} min={-12} max={12} unit="dB"
        onChange={(v) => onUpdateParams(id, { low: v })} />
      <Slider label="Mid (1kHz)" value={params.mid} min={-12} max={12} unit="dB"
        onChange={(v) => onUpdateParams(id, { mid: v })} />
      <Slider label="High (5kHz)" value={params.high} min={-12} max={12} unit="dB"
        onChange={(v) => onUpdateParams(id, { high: v })} />
    </div>
  );
}

// ── Pitch knob helpers ───────────────────────────────────────────────────────
//
// Knob geometry (84×84 viewBox, center 42,42, track radius 33):
//   CENTER = 270° → 12 o'clock (top of circle)
//   Travel = ±180° from center — full 360° sweep
//   Min angle: 270 - 180 = 90°  → 6 o'clock (bottom)
//   Max angle: 270 + 180 = 450° = 90° → 6 o'clock (bottom)
//   Both extremes land at 6 o'clock; zero is at 12 o'clock.

const KNOB_CENTER  = 270; // degrees — 12 o'clock
const KNOB_SPAN    = 180; // degrees each side — full 360° sweep, both extremes reach 6 o'clock

function polarToXY(angleDeg: number, r = 33, cx = 42, cy = 42) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildKnobArc(value: number, min: number, max: number) {
  // Map [min, max] to [-1, +1] around the midpoint
  const mid   = (min + max) / 2;
  const half  = (max - min) / 2;
  const ratio = (value - mid) / half; // -1 … +1

  const endAngle = KNOB_CENTER + ratio * KNOB_SPAN;
  const start    = polarToXY(KNOB_CENTER);
  const end      = polarToXY(endAngle);
  const absAngle = Math.abs(ratio * KNOB_SPAN);
  const largeArc = absAngle > 180 ? 1 : 0;
  const sweep    = ratio >= 0 ? 1 : 0;

  // Indicator tick: short line near face edge at current angle
  const tickInner = polarToXY(endAngle, 19);
  const tickOuter = polarToXY(endAngle, 24);

  if (Math.abs(value - mid) < 0.5) {
    const zeroTick = { inner: polarToXY(KNOB_CENTER, 19), outer: polarToXY(KNOB_CENTER, 24) };
    return { d: '', tick: zeroTick, color: '#252940' };
  }
  return {
    d: `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A 33 33 0 ${largeArc} ${sweep} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    tick: { inner: tickInner, outer: tickOuter },
    color: value > mid ? '#6366f1' : '#c084fc',
  };
}

// ── Reusable pitch knob ───────────────────────────────────────────────────────

interface PitchKnobProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  onCommit: (v: number) => void;
}

function PitchKnob({ value, min, max, label, unit, onCommit }: PitchKnobProps) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);

  const dragRef = useRef<{ startY: number; startVal: number } | null>(null);
  // px of drag to traverse the full range
  // 160 px = 120 × (180/135): compensated for the wider 360° sweep vs the old 270° baseline.
  const PX_PER_RANGE = 160;

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = { startY: e.clientY, startVal: local };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const dy    = dragRef.current.startY - e.clientY; // up = positive
    const range = max - min;
    const delta = (dy / PX_PER_RANGE) * range;
    const next  = Math.round(Math.max(min, Math.min(max, dragRef.current.startVal + delta)));
    setLocal(next);
  };

  const handlePointerUp = () => {
    if (dragRef.current) { onCommit(local); dragRef.current = null; }
  };

  const handleDblClick = () => { setLocal(0); onCommit(0); };

  const { d, tick, color } = buildKnobArc(local, min, max);
  const sign = local > 0 ? '+' : '';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width="84" height="84" viewBox="0 0 84 84"
        className="cursor-ns-resize select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDblClick}
      >
        {/* Track ring — full circle; span=180° means the groove equals the full ring */}
        <circle cx="42" cy="42" r="33" fill="none" stroke="#252940" strokeWidth="5" />
        {/* Value arc */}
        {d && <path d={d} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />}
        {/* Face */}
        <circle cx="42" cy="42" r="26" fill="#111427" stroke="#252940" strokeWidth="1" />
        {/* Indicator tick — short line near face edge, always at current angle */}
        <line
          x1={tick.inner.x.toFixed(2)} y1={tick.inner.y.toFixed(2)}
          x2={tick.outer.x.toFixed(2)} y2={tick.outer.y.toFixed(2)}
          stroke="#67e8f9" strokeWidth="2.5" strokeLinecap="round"
        />
      </svg>
      <span className="font-mono text-[12px] font-bold leading-none text-cw-timestamp">
        {sign}{local}
        <span className="ml-0.5 text-[9px] font-normal text-cw-text-secondary">{unit}</span>
      </span>
      <span className="text-[9px] text-cw-text-secondary">{label}</span>
    </div>
  );
}

const PITCH_RANGES = [1, 6, 12, 24] as const;
type PitchRange = (typeof PITCH_RANGES)[number];

function PitchPanel({ params, id, onUpdateParams }: {
  params: PitchParams;
  id: string;
  onUpdateParams: (id: string, p: Partial<FxParams>) => void;
}) {
  // Default to ±12; expand automatically if the stored value needs a wider range
  const [range, setRange] = useState<PitchRange>(() => {
    const abs = Math.abs(params.semitones);
    return (PITCH_RANGES.find((r) => r >= abs && r >= 12) ?? 24) as PitchRange;
  });

  const handleRangeChange = (r: PitchRange) => {
    setRange(r);
    // Clamp the live semitone value to the new range
    const clamped = Math.max(-r, Math.min(r, params.semitones));
    if (clamped !== params.semitones) onUpdateParams(id, { semitones: clamped });
  };

  return (
    <div className="flex flex-col items-center gap-3 px-3 pb-3 pt-2">
      {/* Semitones knob */}
      <PitchKnob
        value={params.semitones}
        min={-range}
        max={range}
        label="Semitones"
        unit="st"
        onCommit={(v) => onUpdateParams(id, { semitones: v })}
      />

      {/* Range pills */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[9px] uppercase tracking-wider text-cw-text-secondary">Range</span>
        <div className="flex gap-1">
          {PITCH_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              className={[
                'rounded-full border px-2 py-0.5 font-mono text-[10px] transition-all',
                r === range
                  ? 'border-cw-action-bold bg-cw-action-bold/15 text-cw-action'
                  : 'border-cw-border text-cw-text-secondary hover:border-cw-action hover:text-cw-action',
              ].join(' ')}
            >
              ±{r}
            </button>
          ))}
        </div>
      </div>

      {/* Fine-tune (cents) slider */}
      <div className="w-full">
        <Slider
          label="Fine tune"
          value={params.cents}
          min={-100}
          max={100}
          unit="¢"
          onChange={(v) => onUpdateParams(id, { cents: v })}
        />
      </div>

      {/* Formant preservation toggle */}
      <button
        onClick={() => onUpdateParams(id, { preserveFormants: !params.preserveFormants })}
        className={[
          'w-full rounded-md border px-3 py-1.5 text-[10px] font-medium transition-colors',
          params.preserveFormants
            ? 'border-cw-action-bold bg-cw-action-bold/15 text-cw-action'
            : 'border-cw-border text-cw-text-secondary hover:border-cw-action hover:text-cw-action',
        ].join(' ')}
      >
        Preserve Formants
      </button>
    </div>
  );
}

function ParamPanel({ item, onUpdateParams }: {
  item: FxChainItem;
  onUpdateParams: (id: string, p: Partial<FxParams>) => void;
}) {
  if (item.type === 'delay') return <DelayPanel params={item.params as DelayParams} id={item.id} onUpdateParams={onUpdateParams} />;
  if (item.type === 'reverb') return <ReverbPanel params={item.params as ReverbParams} id={item.id} onUpdateParams={onUpdateParams} />;
  if (item.type === 'distortion') return <DistortionPanel params={item.params as DistortionParams} id={item.id} onUpdateParams={onUpdateParams} />;
  if (item.type === 'eq') return <EqPanel params={item.params as EqParams} id={item.id} onUpdateParams={onUpdateParams} />;
  if (item.type === 'pitch') return <PitchPanel params={item.params as PitchParams} id={item.id} onUpdateParams={onUpdateParams} />;
  return null; // reverse has no params
}

// ── FX card ──────────────────────────────────────────────────────────────────

interface FxCardProps {
  item: FxChainItem;
  index: number;
  total: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateParams: (id: string, p: Partial<FxParams>) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isOver: boolean;
}

function FxCard({
  item,
  index,
  onToggle,
  onRemove,
  onUpdateParams,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isOver,
}: FxCardProps) {
  const [expanded, setExpanded] = useState(true);
  const hasParams = item.type !== 'reverse'; // pitch has params, reverse doesn't

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      className={[
        'cw-card-enter group rounded-lg border select-none',
        item.enabled ? 'border-cw-action-bold/40 bg-cw-surface' : 'border-cw-border bg-cw-surface/50',
        isDragging ? 'opacity-40' : 'opacity-100',
        isOver ? 'ring-1 ring-cw-action-bold/60' : '',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Drag handle — only this initiates the drag */}
        <div
          draggable
          onDragStart={() => onDragStart(index)}
          onDragEnd={onDragEnd}
          className="cursor-grab text-cw-text-secondary active:cursor-grabbing"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="4" cy="3" r="1.2" />
            <circle cx="8" cy="3" r="1.2" />
            <circle cx="4" cy="6" r="1.2" />
            <circle cx="8" cy="6" r="1.2" />
            <circle cx="4" cy="9" r="1.2" />
            <circle cx="8" cy="9" r="1.2" />
          </svg>
        </div>

        {/* Bypass toggle */}
        <button
          onClick={() => onToggle(item.id)}
          className={[
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-colors',
            item.enabled
              ? 'bg-cw-action-bold text-white'
              : 'bg-cw-border text-cw-text-secondary',
          ].join(' ')}
          title={item.enabled ? 'Bypass' : 'Enable'}
        >
          {item.enabled ? '●' : '○'}
        </button>

        {/* Label — click to expand if has params */}
        <span
          className={[
            'flex-1 text-xs font-medium',
            item.enabled ? 'text-cw-text-primary' : 'text-cw-text-secondary',
            hasParams ? 'cursor-pointer' : '',
          ].join(' ')}
          onClick={() => hasParams && setExpanded((v) => !v)}
        >
          {FX_LABELS[item.type]}
        </span>

        {/* Chevron */}
        {hasParams && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="cw-chevron text-cw-text-secondary"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="3,5 6,8 9,5" />
            </svg>
          </button>
        )}

        {/* Delete */}
        <button
          onClick={() => onRemove(item.id)}
          className="opacity-0 transition-opacity hover:text-cw-error group-hover:opacity-100 text-cw-text-secondary"
          title="Remove"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="2" y1="2" x2="10" y2="10" />
            <line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      </div>

      {/* Params */}
      {hasParams && expanded && (
        <div className="border-t border-cw-border/50">
          <ParamPanel item={item} onUpdateParams={onUpdateParams} />
        </div>
      )}
    </div>
  );
}

// ── Add FX picker ─────────────────────────────────────────────────────────────

function AddFxPicker({ onAdd, onClose }: { onAdd: (type: FxType) => void; onClose: () => void }) {
  return (
    <div className="rounded-lg border border-cw-border bg-cw-elevated p-2 shadow-xl">
      <div className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-widest text-cw-text-secondary">
        Add Effect
      </div>
      <div className="flex flex-col gap-0.5">
        {ALL_FX_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => { onAdd(type); onClose(); }}
            className="rounded-md px-2 py-1.5 text-left text-xs text-cw-text-primary transition-colors hover:bg-cw-surface"
          >
            {FX_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main FxChain component ────────────────────────────────────────────────────

export default function FxChain({
  chain,
  isProcessing,
  onAdd,
  onRemove,
  onToggle,
  onUpdateParams,
  onReorder,
}: FxChainProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragFrom(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragOver(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) {
      onReorder(dragFrom, dragOver);
    }
    setDragFrom(null);
    setDragOver(null);
  }, [dragFrom, dragOver, onReorder]);

  return (
    <div className="px-4 pt-1 pb-2">
      {/* Section header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-widest text-cw-text-secondary">
          FX Chain
          {isProcessing && (
            <span className="ml-1.5 text-cw-action-bold">processing…</span>
          )}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="cw-pressable flex items-center gap-1 rounded-md border border-cw-border bg-cw-surface px-2 py-0.5 text-[10px] text-cw-text-secondary hover:bg-cw-elevated hover:text-cw-text-primary"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="4" y1="1" x2="4" y2="7" />
              <line x1="1" y1="4" x2="7" y2="4" />
            </svg>
            Add FX
          </button>
          {showPicker && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowPicker(false)}
              />
              <div className="cw-popover-enter absolute right-0 top-full z-20 mt-1 w-36">
                <AddFxPicker
                  onAdd={onAdd}
                  onClose={() => setShowPicker(false)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chain items */}
      {chain.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-cw-text-secondary">
          No effects — click Add FX to get started
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {chain.map((item, index) => (
            <FxCard
              key={item.id}
              item={item}
              index={index}
              total={chain.length}
              onToggle={onToggle}
              onRemove={onRemove}
              onUpdateParams={onUpdateParams}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              isDragging={dragFrom === index}
              isOver={dragOver === index && dragFrom !== index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
