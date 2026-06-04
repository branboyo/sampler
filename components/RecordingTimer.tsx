interface RecordingTimerProps {
  elapsed: number;
  maxDuration: number;
  isRecording?: boolean;
}

function formatTime(seconds: number): { main: string; ms: string } {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return {
    main: `${m}:${s.toString().padStart(2, '0')}`,
    ms: `.${cs.toString().padStart(2, '0')}`,
  };
}

function formatLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RecordingTimer({ elapsed, maxDuration, isRecording }: RecordingTimerProps) {
  const progress = maxDuration > 0 ? (elapsed / maxDuration) * 100 : 0;
  const nearEnd = progress > 80;
  const { main, ms } = formatTime(elapsed);

  return (
    <div
      data-testid="recording-timer"
      className={`mx-5 rounded-2xl border bg-cw-surface pt-8 pb-3 text-center ${
        isRecording ? 'border-cw-attention/15' : 'border-cw-border'
      }`}
    >
      <div className="flex items-baseline justify-center">
        <span
          className={`font-ui text-[44px] font-bold leading-none [font-variant-numeric:tabular-nums] transition-colors duration-500 ${
            nearEnd ? 'text-cw-warning' : 'text-cw-text'
          }`}
        >
          {main}
        </span>
        <span className="font-ui text-[28px] font-bold leading-none [font-variant-numeric:tabular-nums] text-cw-text-muted">
          {ms}
        </span>
      </div>
      <div className="mt-2 font-ui text-[11px] text-cw-text-muted">
        / {formatLabel(maxDuration)} max
      </div>
      <div className="mx-auto mt-4 h-[3px] w-4/5 overflow-hidden rounded-full bg-cw-border">
        <div
          className="h-full rounded-full bg-cw-attention transition-[width] duration-300 ease-linear"
          style={{
            width: `${Math.min(progress, 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
