import type { AudioFormat } from '@/types';

interface SaveControlsProps {
  format: AudioFormat;
  onFormatChange: (format: AudioFormat) => void;
  onSave: () => void;
  disabled: boolean;
}

export default function SaveControls({
  format,
  onFormatChange,
  onSave,
  disabled,
}: SaveControlsProps) {
  return (
    <div data-testid="save-controls" className="flex gap-2 px-4">
      <select
        value={format}
        onChange={(e) => onFormatChange(e.target.value as AudioFormat)}
        className="w-[70px] shrink-0 rounded-md border border-gray-700 bg-gray-900 px-2 py-2 text-xs text-gray-300"
      >
        <option value="wav">WAV</option>
        <option value="mp3">MP3</option>
      </select>
      <button
        onClick={onSave}
        disabled={disabled}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-blue-600 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Save
      </button>
    </div>
  );
}
