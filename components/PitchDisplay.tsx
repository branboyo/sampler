import type { PitchResult } from '@/lib/pitch-detection';

interface PitchDisplayProps {
  pitch: PitchResult | null;
}

function CentsGauge({ cents }: { cents: number }) {
  const pct = Math.max(0, Math.min(100, 50 + cents));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-cw-text-muted">flat</span>
      <div className="relative h-2.5 w-28 rounded-full bg-cw-border">
        <div className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-cw-text-muted/40" />
        <div
          className="absolute top-1/2 h-3.5 w-1.5 rounded-full bg-cw-primary"
          style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <span className="text-[9px] text-cw-text-muted">sharp</span>
    </div>
  );
}

export default function PitchDisplay({ pitch }: PitchDisplayProps) {
  return (
    <div className="rounded-2xl border border-cw-border bg-cw-surface mx-5 px-4 py-3 shadow-lg shadow-black/25">
      {pitch ? (
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1">
            <span className="text-[28px] font-bold leading-none text-cw-primary">
              {pitch.note}
            </span>
            <span className="text-[16px] font-medium text-cw-text-muted">
              {pitch.octave}
            </span>
          </div>
          <span className={`text-[12px] font-medium [font-variant-numeric:tabular-nums] ${Math.abs(pitch.cents) < 10 ? 'text-cw-success' : 'text-cw-warning'}`}>
            {pitch.cents >= 0 ? '+' : ''}{pitch.cents}¢
          </span>
          <div className="ml-auto flex items-center gap-2.5">
            <CentsGauge cents={pitch.cents} />
            <span className="text-[9px] text-cw-text-muted [font-variant-numeric:tabular-nums]">
              {pitch.frequency.toFixed(1)} Hz
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-0.5">
          <span className="text-[11px] text-cw-text-muted">no pitch detected</span>
        </div>
      )}
    </div>
  );
}
