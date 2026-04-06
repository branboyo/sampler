import { useRef } from 'react';

interface LiveWaveformProps {
  analyserNode: AnalyserNode | null;
}

export default function LiveWaveform({ analyserNode: _analyserNode }: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div data-testid="live-waveform" className="px-4">
      <canvas
        ref={canvasRef}
        className="h-24 w-full rounded-md bg-gray-900"
      />
    </div>
  );
}
