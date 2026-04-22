interface PlaybackControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
}

export default function PlaybackControls({ isPlaying, onToggle }: PlaybackControlsProps) {
  return (
    <div data-testid="playback-controls" className="flex justify-center py-2">
      <div className="relative">
        {/* Breathing ring visible while playing */}
        {isPlaying && (
          <span
            className="cw-playing-ring absolute inset-0 rounded-full"
            aria-hidden
          />
        )}
        <button
          onClick={onToggle}
          className="cw-pressable relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-cw-action-bold shadow-lg shadow-cw-action-bold/20"
        >
          {isPlaying ? (
            <div key="pause" className="cw-icon flex gap-1">
              <div className="h-3 w-1 bg-white" />
              <div className="h-3 w-1 bg-white" />
            </div>
          ) : (
            <svg key="play" className="cw-icon" width="14" height="14" viewBox="0 0 24 24" fill="white">
              <polygon points="6,3 20,12 6,21" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
