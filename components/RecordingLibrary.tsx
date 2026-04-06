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
      <div data-testid="recording-library" className="px-4 py-3 text-center text-xs text-gray-600">
        No recordings yet
      </div>
    );
  }

  return (
    <div data-testid="recording-library" className="border-t border-gray-800 px-4 py-3">
      <div className="mb-2 text-xs text-gray-500">Library</div>
      <div className="flex flex-col gap-1.5">
        {recordings.map((rec) => (
          <div
            key={rec.id}
            className="flex items-center justify-between rounded-md bg-gray-900 p-2"
          >
            <button onClick={() => onSelect(rec.id)} className="text-left">
              <div className="text-xs text-gray-300">{rec.name}</div>
              <div className="text-[10px] text-gray-600">
                {formatDuration(rec.duration)} · {formatSize(rec.size)}
              </div>
            </button>
            <button
              onClick={() => onDelete(rec.id)}
              className="text-xs text-gray-600 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
