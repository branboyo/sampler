interface RecordButtonProps {
  isRecording: boolean;
  onToggle: () => void;
}

export default function RecordButton({ isRecording, onToggle }: RecordButtonProps) {
  return (
    <div className={`relative ${!isRecording ? 'pulse-idle-glow' : ''}`}>
      <button
        onClick={onToggle}
        data-testid="record-button"
        className={`cw-pressable relative flex items-center justify-center rounded-full cursor-pointer ${
          isRecording
            ? 'h-14 w-14 bg-cw-attention'
            : 'h-16 w-16 bg-cw-primary'
        }`}
      >
        {isRecording ? (
          <div key="stop" className="cw-icon h-4 w-4 rounded-[3px] bg-cw-bg" />
        ) : (
          <div key="record" className="cw-icon h-5 w-5 rounded-full bg-cw-bg" />
        )}
      </button>
    </div>
  );
}
