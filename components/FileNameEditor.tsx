import { useState } from 'react';

interface FileNameEditorProps {
  name: string;
  onChange: (name: string) => void;
}

export default function FileNameEditor({ name, onChange }: FileNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    onChange(draft);
    setIsEditing(false);
  };

  return (
    <div data-testid="filename-editor" className="px-4 pt-3">
      {isEditing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-full border-b border-gray-600 bg-transparent text-sm text-white outline-none"
        />
      ) : (
        <button
          onClick={() => { setDraft(name); setIsEditing(true); }}
          className="flex items-center gap-1.5"
        >
          <span className="border-b border-dashed border-gray-600 pb-0.5 text-sm text-white">
            {name}
          </span>
          <span className="text-[11px] text-gray-600">✏</span>
        </button>
      )}
    </div>
  );
}
