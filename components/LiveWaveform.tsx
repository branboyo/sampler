import { useRef, useEffect } from 'react';

interface LiveWaveformProps {
  analyserNode: AnalyserNode | null;
}

const BAR_WIDTH = 3;
const BAR_GAP = 2;

// Solid cw-primary (#eef5c5), opacity varies with amplitude (0.4 to 1.0)
function barOpacity(value: number): number {
  return 0.4 + 0.6 * value;
}

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
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      analyserNode.getByteFrequencyData(dataArray);

      const barCount = Math.floor(width / (BAR_WIDTH + BAR_GAP));
      const step = Math.max(1, Math.floor(dataArray.length / barCount));

      // Draw a faint center baseline
      ctx.fillStyle = 'rgba(245,250,217,0.08)';
      ctx.fillRect(0, centerY - 0.5, width, 1);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255;
        const halfH = Math.max(1.5, value * (height / 2) * 0.88);
        const x = i * (BAR_WIDTH + BAR_GAP);

        // Left bars are dimmer (scrolling time illusion)
        const positionOpacity = 0.28 + 0.72 * (i / barCount);
        ctx.fillStyle = '#eef5c5';
        ctx.globalAlpha = barOpacity(value) * positionOpacity;

        // Upper half — rounded at top
        ctx.beginPath();
        ctx.roundRect(x, centerY - halfH, BAR_WIDTH, halfH, [1, 1, 0, 0]);
        ctx.fill();

        // Lower half — rounded at bottom (1px gap at center for definition)
        ctx.beginPath();
        ctx.roundRect(x, centerY + 1, BAR_WIDTH, halfH - 1, [0, 0, 1, 1]);
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
    <div data-testid="live-waveform" className="rounded-2xl border border-cw-border bg-cw-surface mx-5 p-3 shadow-lg shadow-black/25">
      <canvas
        ref={canvasRef}
        className="h-[100px] w-full rounded-[10px]"
      />
    </div>
  );
}
