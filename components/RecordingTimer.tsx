interface RecordingTimerProps {
  elapsed: number;
  maxDuration: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RecordingTimer({ elapsed, maxDuration }: RecordingTimerProps) {
  const progress = maxDuration > 0 ? (elapsed / maxDuration) * 100 : 0;
  const nearEnd = progress > 80;

  return (
    <div data-testid="recording-timer" className="px-4 pt-8 pb-3 text-center">
      <div className={`cw-timer-glow font-mono text-[40px] font-bold leading-none transition-colors duration-500 ${nearEnd ? 'text-cw-error' : 'text-cw-recording'}`}>
        {formatTime(elapsed)}
      </div>
      <div className="mt-2 font-mono text-[11px] text-cw-text-secondary">
        / {formatTime(maxDuration)} max
      </div>
      <div className="mx-auto mt-4 h-[3px] w-4/5 overflow-hidden rounded-full bg-cw-surface">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-linear"
          style={{
            width: `${Math.min(progress, 100)}%`,
            backgroundColor: nearEnd ? '#f472b6' : '#a855f7',
            boxShadow: nearEnd
              ? '0 0 8px rgba(244,114,182,0.7), 0 0 16px rgba(244,114,182,0.35)'
              : '0 0 8px rgba(168,85,247,0.7), 0 0 16px rgba(168,85,247,0.35)',
          }}
        />
      </div>
    </div>
  );
}
