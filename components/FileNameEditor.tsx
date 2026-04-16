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
    <div data-testid="filename-editor" className="px-4 pt-3 pb-1">
      {isEditing ? (
        <input
          autoFocus
          value={draft}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-full border-b border-cw-text-secondary/40 bg-transparent text-[13px] text-cw-text-primary outline-none"
        />
      ) : (
        <button
          onClick={() => { setDraft(name); setIsEditing(true); }}
          className="flex items-center gap-1.5"
        >
          <span className="border-b border-dashed border-cw-text-secondary/40 pb-px text-[13px] text-cw-text-primary">
            {name}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6e7191" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
      {duration != null && size != null && (
        <div className="mt-1 text-[10px] text-cw-text-secondary">
          {formatDuration(duration)} · {formatSize(size)}
        </div>
      )}
    </div>
  );
}
