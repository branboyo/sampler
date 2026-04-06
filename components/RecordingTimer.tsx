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

  return (
    <div data-testid="recording-timer" className="text-center">
      <div className="font-mono text-4xl font-bold text-red-500">
        {formatTime(elapsed)}
      </div>
      <div className="mt-1 text-xs text-gray-600">/ {formatTime(maxDuration)} max</div>
      <div className="mx-auto mt-3 h-1 w-4/5 rounded bg-gray-800">
        <div
          className="h-full rounded bg-red-500 transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
