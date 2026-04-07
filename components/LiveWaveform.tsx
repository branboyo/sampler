import { useRef, useEffect } from 'react';

interface LiveWaveformProps {
  analyserNode: AnalyserNode | null;
}

const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_COLOR = '#ef4444';

export default function LiveWaveform({ analyserNode }: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);

      // Match canvas resolution to display size
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);

      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      analyserNode.getByteFrequencyData(dataArray);

      const barCount = Math.floor(width / (BAR_WIDTH + BAR_GAP));
      const step = Math.max(1, Math.floor(dataArray.length / barCount));

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255;
        const barHeight = Math.max(2, value * height * 0.85);
        const x = i * (BAR_WIDTH + BAR_GAP);
        const y = (height - barHeight) / 2;

        // Fade: older bars (left) are dimmer
        const opacity = 0.3 + 0.7 * (i / barCount);

        ctx.fillStyle = BAR_COLOR;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, barHeight, 1);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyserNode]);

  return (
    <div data-testid="live-waveform" className="px-4">
      <canvas
        ref={canvasRef}
        className="h-24 w-full rounded-md bg-gray-900"
      />
    </div>
  );
}
