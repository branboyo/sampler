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
    <div data-testid="save-controls" className="flex gap-2 px-4 py-3">
      <select
        value={format}
        onChange={(e) => onFormatChange(e.target.value as AudioFormat)}
        className="w-[72px] shrink-0 cursor-pointer appearance-none rounded-lg border border-cw-border bg-cw-surface px-2.5 py-2 text-xs text-cw-text-primary"
      >
        <option value="wav">WAV</option>
        <option value="mp3">MP3</option>
      </select>
      <button
        onClick={onSave}
        disabled={disabled}
        className="cw-pressable flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-cw-action-bold py-2 text-xs font-semibold text-white shadow-md shadow-cw-action-bold/20 hover:bg-cw-action hover:shadow-[0_0_20px_rgba(99,102,241,0.45)] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
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
