import type { RecordingMeta } from '@/types';

interface RecordingLibraryProps {
  recordings: RecordingMeta[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RecordingLibrary({
  recordings,
  onSelect,
  onDelete,
}: RecordingLibraryProps) {
  if (recordings.length === 0) {
    return (
      <div data-testid="recording-library" className="mx-5 text-center text-xs text-cw-text-muted">
        No recordings yet
      </div>
    );
  }

  return (
    <div data-testid="recording-library" className="rounded-2xl border border-cw-border bg-cw-surface mx-5 px-4 py-3">
      <div className="mb-3 text-[12px] font-semibold uppercase tracking-[1px] text-cw-text-muted">
        Library
      </div>
      <div className="flex flex-col gap-2">
        {recordings.map((rec) => (
          <div
            key={rec.id}
            className="group flex cursor-pointer items-center justify-between bg-cw-bg rounded-[10px] border border-cw-border px-3 py-2.5"
          >
            <button onClick={() => onSelect(rec.id)} className="text-left">
              <div className="text-xs font-medium text-cw-text">{rec.name}</div>
              <div className="mt-0.5 text-[10px] text-cw-text-muted">
                {formatDuration(rec.duration)} · {formatSize(rec.size)}
              </div>
            </button>
            <button
              onClick={() => onDelete(rec.id)}
              className="text-xs text-cw-text-muted opacity-0 transition-opacity hover:text-cw-attention group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
