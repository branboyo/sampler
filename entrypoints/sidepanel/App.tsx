import { useState } from 'react';
import type { AppState } from '@/types';

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              appState === 'recording' ? 'animate-pulse bg-red-500' : 'bg-green-500'
            }`}
          />
          <span className="text-sm font-semibold">ChromeWave</span>
        </div>
        <button className="text-xs text-gray-500">⚙</button>
      </div>

      {/* Content area — components will be wired in Task 10 */}
      <div className="p-4">
        {appState === 'idle' && (
          <div className="text-center text-gray-500">
            <p className="mb-4 text-sm">Ready to record</p>
          </div>
        )}
        {appState === 'recording' && (
          <div className="text-center text-gray-500">
            <p className="text-sm">Recording...</p>
          </div>
        )}
        {appState === 'editing' && (
          <div className="text-center text-gray-500">
            <p className="text-sm">Editing</p>
          </div>
        )}
      </div>

      {/* Dev-only state switcher (remove before production) */}
      <div className="fixed bottom-0 left-0 right-0 flex gap-1 border-t border-gray-800 bg-[#0f0f0f] p-2">
        {(['idle', 'recording', 'editing'] as AppState[]).map((s) => (
          <button
            key={s}
            onClick={() => setAppState(s)}
            className={`flex-1 rounded px-2 py-1 text-xs ${
              appState === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
