import type { PitchResult } from '@/lib/pitch-detection';

interface PitchDisplayProps {
  pitch: PitchResult | null;
}

function CentsGauge({ cents }: { cents: number }) {
  const pct = Math.max(0, Math.min(100, 50 + cents));
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-cw-text-secondary">flat</span>
      <div className="relative h-1.5 w-16 rounded-full bg-cw-border">
        <div className="absolute left-1/2 top-0 h-1.5 w-px -translate-x-1/2 bg-cw-text-secondary/40" />
        <div
          className="absolute top-1/2 h-2.5 w-1 rounded-full bg-cw-action-bold shadow-[0_0_6px_rgba(99,102,241,0.5)]"
          style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <span className="text-[9px] text-cw-text-secondary">sharp</span>
      <span className="w-9 text-right font-mono text-[9px] text-cw-timestamp">
        {cents >= 0 ? '+' : ''}
        {cents}¢
      </span>
    </div>
  );
}

export default function PitchDisplay({ pitch }: PitchDisplayProps) {
  return (
    <div className="cw-section-enter mx-4 rounded-lg bg-cw-surface px-3 py-2">
      {pitch ? (
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold leading-none text-cw-text-primary">
              {pitch.note}
            </span>
            <span className="text-xs font-medium text-cw-text-secondary">
              {pitch.octave}
            </span>
          </div>
          <span className="font-mono text-[11px] text-cw-timestamp">
            {pitch.frequency.toFixed(1)} Hz
          </span>
          <div className="ml-auto">
            <CentsGauge cents={pitch.cents} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-0.5">
          <span className="text-[11px] text-cw-text-secondary">no pitch detected</span>
        </div>
      )}
    </div>
  );
}
