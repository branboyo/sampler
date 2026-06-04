import { useState } from 'react';

interface FileNameEditorProps {
  name: string;
  onChange: (name: string) => void;
  duration?: number;
  size?: number;
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

export default function FileNameEditor({ name, onChange, duration, size }: FileNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    onChange(draft);
    setIsEditing(false);
  };

  return (
    <div data-testid="filename-editor" className="rounded-2xl border border-cw-border bg-cw-surface mx-5 px-4 py-3">
      <div className="flex justify-between items-center">
        {isEditing ? (
          <input
            autoFocus
            value={draft}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            className="w-full border-b border-cw-border bg-transparent text-sm text-cw-text outline-none"
          />
        ) : (
          <button
            onClick={() => { setDraft(name); setIsEditing(true); }}
            className="flex items-center gap-1.5"
          >
            <span className="text-sm font-semibold text-cw-text">
              {name}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(245,250,217,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        {duration != null && size != null && (
          <div className="text-[10px] text-cw-text-muted">
            {formatDuration(duration)} · {formatSize(size)}
          </div>
        )}
      </div>
    </div>
  );
}
