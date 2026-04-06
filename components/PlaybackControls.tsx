interface PlaybackControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
}

export default function PlaybackControls({ isPlaying, onToggle }: PlaybackControlsProps) {
  return (
    <div data-testid="playback-controls" className="flex justify-center py-2">
      <button
        onClick={onToggle}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600"
      >
        {isPlaying ? (
          <div className="flex gap-1">
            <div className="h-3 w-1 bg-white" />
            <div className="h-3 w-1 bg-white" />
          </div>
        ) : (
          <div className="ml-0.5 h-0 w-0 border-b-[7px] border-l-[12px] border-t-[7px] border-b-transparent border-l-white border-t-transparent" />
        )}
      </button>
    </div>
  );
}
