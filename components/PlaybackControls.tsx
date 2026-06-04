interface PlaybackControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
}

export default function PlaybackControls({ isPlaying, onToggle }: PlaybackControlsProps) {
  return (
    <div data-testid="playback-controls" className="flex justify-center py-2">
      <button
        onClick={onToggle}
        className="cw-pressable relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-cw-primary"
      >
        {isPlaying ? (
          <div key="pause" className="cw-icon flex gap-1">
            <div className="h-3 w-1 bg-cw-bg" />
            <div className="h-3 w-1 bg-cw-bg" />
          </div>
        ) : (
          <svg key="play" className="cw-icon" width="14" height="14" viewBox="0 0 24 24" fill="#0f1010">
            <polygon points="6,3 20,12 6,21" />
          </svg>
        )}
      </button>
    </div>
  );
}
