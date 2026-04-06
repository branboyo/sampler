interface RecordButtonProps {
  isRecording: boolean;
  onToggle: () => void;
}

export default function RecordButton({ isRecording, onToggle }: RecordButtonProps) {
  return (
    <button
      onClick={onToggle}
      data-testid="record-button"
      className={`flex h-14 w-14 items-center justify-center rounded-full ${
        isRecording ? 'bg-red-500' : 'bg-red-500'
      }`}
    >
      {isRecording ? (
        <div className="h-5 w-5 rounded-sm bg-white" />
      ) : (
        <div className="h-5 w-5 rounded-full bg-white" />
      )}
    </button>
  );
}
