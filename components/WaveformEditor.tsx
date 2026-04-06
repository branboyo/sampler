import { useRef } from 'react';

interface WaveformEditorProps {
  audioBuffer: AudioBuffer | null;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
}

export default function WaveformEditor({
  audioBuffer: _audioBuffer,
  trimStart,
  trimEnd,
  onTrimChange: _onTrimChange,
}: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div data-testid="waveform-editor" className="px-4">
      <div ref={containerRef} className="h-20 rounded-md bg-gray-900" />
      <div className="mt-1 flex justify-between">
        <span className="font-mono text-[10px] text-yellow-400">
          {trimStart.toFixed(1)}s
        </span>
        <span className="font-mono text-[10px] text-yellow-400">
          {trimEnd.toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
