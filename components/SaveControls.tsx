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
    <div data-testid="save-controls" className="flex gap-2 px-5 py-3">
      <select
        value={format}
        onChange={(e) => onFormatChange(e.target.value as AudioFormat)}
        className="w-[72px] shrink-0 cursor-pointer appearance-none rounded-[10px] border border-cw-border bg-cw-surface px-2.5 py-2 text-xs text-cw-text-muted"
      >
        <option value="wav">WAV</option>
        <option value="mp3">MP3</option>
      </select>
      <button
        onClick={onSave}
        disabled={disabled}
        className="cw-pressable flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-cw-primary py-2 text-xs font-semibold text-cw-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0f1010"
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
