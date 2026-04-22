import { useRef, useEffect } from 'react';

interface LiveWaveformProps {
  analyserNode: AnalyserNode | null;
}

const BAR_WIDTH = 3;
const BAR_GAP = 2;

// Interpolate between cw-recording (#c084fc) and cw-timestamp (#67e8f9) by amplitude
function barColor(value: number): string {
  const r = Math.round(192 + (103 - 192) * value); // 192 → 103
  const g = Math.round(132 + (232 - 132) * value); // 132 → 232
  const b = Math.round(252 + (249 - 252) * value); // 252 → 249
  return `rgb(${r},${g},${b})`;
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
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#6e7191';
      ctx.fillRect(0, centerY - 0.5, width, 1);
      ctx.globalAlpha = 1;

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255;
        const halfH = Math.max(1.5, value * (height / 2) * 0.88);
        const x = i * (BAR_WIDTH + BAR_GAP);

        // Left bars are dimmer (scrolling time illusion)
        const opacity = 0.28 + 0.72 * (i / barCount);
        const color = barColor(value);

        ctx.shadowColor = color;
        ctx.shadowBlur = 6 + value * 10;
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;

        // Upper half — rounded at top
        ctx.beginPath();
        ctx.roundRect(x, centerY - halfH, BAR_WIDTH, halfH, [1, 1, 0, 0]);
        ctx.fill();

        // Lower half — rounded at bottom (1px gap at center for definition)
        ctx.beginPath();
        ctx.roundRect(x, centerY + 1, BAR_WIDTH, halfH - 1, [0, 0, 1, 1]);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
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
        className="h-[100px] w-full rounded-lg bg-transparent"
      />
    </div>
  );
}
