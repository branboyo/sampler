interface RecordButtonProps {
  isRecording: boolean;
  onToggle: () => void;
}

export default function RecordButton({ isRecording, onToggle }: RecordButtonProps) {
  return (
    <div className="relative">
      {/* Ambient glow blob — larger and brighter while recording */}
      <div
        className={`absolute inset-0 rounded-full blur-xl transition-[transform,opacity] duration-500 ${
          isRecording
            ? 'scale-[2] bg-cw-recording-bold/30'
            : 'scale-150 bg-cw-recording-bold/20'
        }`}
      />

      {/* Sonar rings — only visible while recording */}
      {isRecording && (
        <>
          <div
            className="cw-sonar-ring absolute inset-0 rounded-full"
            style={{ '--ring-delay': '0s' } as React.CSSProperties}
          />
          <div
            className="cw-sonar-ring absolute inset-0 rounded-full"
            style={{ '--ring-delay': '0.8s' } as React.CSSProperties}
          />
          <div
            className="cw-sonar-ring absolute inset-0 rounded-full"
            style={{ '--ring-delay': '1.6s' } as React.CSSProperties}
          />
        </>
      )}

      <button
        onClick={onToggle}
        data-testid="record-button"
        className="cw-pressable relative flex h-16 w-16 items-center justify-center rounded-full bg-cw-recording-bold shadow-lg shadow-cw-recording-bold/30 cursor-pointer"
      >
        {isRecording ? (
          <div key="stop" className="cw-icon h-[18px] w-[18px] rounded-[3px] bg-white" />
        ) : (
          <div key="record" className="cw-icon h-6 w-6 rounded-full bg-white" />
        )}
      </button>
    </div>
  );
}
