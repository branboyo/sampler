import { useState, useEffect } from 'react';
import type { AudioFormat, Settings } from '@/types';
import { useSettings } from '@/hooks/useSettings';

export default function App() {
  const { settings, loading, updateSettings } = useSettings();
  const [form, setForm] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading) setForm(settings);
  }, [loading, settings]);

  const handleSave = async () => {
    await updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md bg-cw-bg p-8 font-ui text-cw-text-primary">
        <p className="text-sm text-cw-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md bg-cw-bg p-6 font-ui text-cw-text-primary">
      <h1 className="mb-6 text-base font-semibold text-cw-text-primary">ChromeWave Settings</h1>

      <label className="mb-5 block">
        <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-cw-text-secondary">
          Download folder name
        </span>
        <input
          type="text"
          value={form.folderName}
          onChange={(e) => setForm((f) => ({ ...f, folderName: e.target.value }))}
          className="w-full rounded-lg border border-cw-border bg-cw-surface px-3 py-2 text-sm text-cw-text-primary transition-colors focus:border-cw-action-bold focus:outline-none"
        />
      </label>

      <label className="mb-5 block">
        <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-cw-text-secondary">
          Preferred format
        </span>
        <select
          value={form.preferredFormat}
          onChange={(e) =>
            setForm((f) => ({ ...f, preferredFormat: e.target.value as AudioFormat }))
          }
          className="w-full cursor-pointer appearance-none rounded-lg border border-cw-border bg-cw-surface px-3 py-2 text-sm text-cw-text-primary transition-colors focus:border-cw-action-bold focus:outline-none"
        >
          <option value="wav">WAV</option>
          <option value="mp3">MP3</option>
        </select>
      </label>

      <label className="mb-5 block">
        <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-cw-text-secondary">
          Sample rate
        </span>
        <select
          value={form.sampleRate}
          onChange={(e) => setForm((f) => ({ ...f, sampleRate: Number(e.target.value) }))}
          className="w-full cursor-pointer appearance-none rounded-lg border border-cw-border bg-cw-surface px-3 py-2 text-sm text-cw-text-primary transition-colors focus:border-cw-action-bold focus:outline-none"
        >
          <option value={22050}>22,050 Hz</option>
          <option value={44100}>44,100 Hz</option>
          <option value={48000}>48,000 Hz</option>
        </select>
      </label>

      {/* Waveform zoom mode */}
      <div className="mb-6">
        <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-cw-text-secondary">
          Waveform zoom style
        </span>
        <p className="mb-3 text-[11px] leading-relaxed text-cw-text-secondary">
          When holding on the waveform or a trim handle, show a magnified view as a floating bubble (default) or an inline panel below the waveform.
        </p>
        <div className="flex gap-2">
          {(['bubble', 'inline'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setForm((f) => ({ ...f, waveformZoomMode: mode }))}
              className={[
                'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                form.waveformZoomMode === mode
                  ? 'border-cw-action-bold bg-cw-action-bold/10 text-cw-action'
                  : 'border-cw-border bg-cw-surface text-cw-text-secondary hover:border-cw-action/50 hover:text-cw-text-primary',
              ].join(' ')}
            >
              {mode === 'bubble' ? '◉ Floating Bubble' : '▤ Inline Panel'}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full cursor-pointer rounded-lg bg-cw-action-bold py-2.5 text-sm font-semibold text-white shadow-md shadow-cw-action-bold/20 transition-colors hover:bg-cw-action"
      >
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
