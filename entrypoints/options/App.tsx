import { useSettings } from '@/hooks/useSettings';

export default function App() {
  const { settings } = useSettings();

  return (
    <div className="mx-auto max-w-md bg-[#0f0f0f] p-8 text-white">
      <h1 className="mb-6 text-lg font-semibold">Flih Settings</h1>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">
          Download folder name
        </span>
        <input
          type="text"
          defaultValue={settings.folderName}
          className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">
          Preferred format
        </span>
        <select
          defaultValue={settings.preferredFormat}
          className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
        >
          <option value="wav">WAV</option>
          <option value="mp3">MP3</option>
        </select>
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">
          Max recording duration (seconds)
        </span>
        <input
          type="number"
          defaultValue={settings.maxDuration}
          min={10}
          max={600}
          className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">
          Sample rate (Hz)
        </span>
        <input
          type="number"
          defaultValue={settings.sampleRate}
          className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
        />
      </label>

      <button className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
        Save Settings
      </button>
    </div>
  );
}
