import type { PitchResult } from '@/lib/pitch-detection';

interface PitchDisplayProps {
  pitch: PitchResult | null;
}

function CentsGauge({ cents }: { cents: number }) {
  const pct = Math.max(0, Math.min(100, 50 + cents));
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-cw-text-muted">flat</span>
      <div className="relative h-1.5 w-16 rounded-full bg-cw-border">
        <div className="absolute left-1/2 top-0 h-1.5 w-px -translate-x-1/2 bg-cw-text-muted/40" />
        <div
          className="absolute top-1/2 h-2.5 w-1 rounded-full bg-cw-primary"
          style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <span className="text-[9px] text-cw-text-muted">sharp</span>
      <span className={`w-9 text-right text-[9px] [font-variant-numeric:tabular-nums] ${Math.abs(cents) < 10 ? 'text-cw-success' : 'text-cw-warning'}`}>
        {cents >= 0 ? '+' : ''}
        {cents}¢
      </span>
    </div>
  );
}

export default function PitchDisplay({ pitch }: PitchDisplayProps) {
  return (
    <div className="rounded-2xl border border-cw-border bg-cw-surface mx-5 px-4 py-3">
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
          <span className="text-[12px] text-cw-text-muted [font-variant-numeric:tabular-nums]">
            {pitch.frequency.toFixed(1)} Hz
          </span>
          <div className="ml-auto">
            <CentsGauge cents={pitch.cents} />
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
