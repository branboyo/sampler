import type { AudioEffect } from '@/types';

interface EffectsBarProps {
  effects: AudioEffect[];
  onApply: (effectId: string) => void;
  disabled: boolean;
  openPanelId: string | null;
  onPanelToggle: (effectId: string) => void;
}

export default function EffectsBar({
  effects,
  onApply,
  disabled,
  openPanelId,
  onPanelToggle,
}: EffectsBarProps) {
  return (
    <div data-testid="effects-bar" className="px-4">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-gray-500">
        Effects
      </div>
      <div className="flex gap-2">
        {effects.map((effect) =>
          effect.panel ? (
            <button
              key={effect.id}
              type="button"
              onClick={() => onPanelToggle(effect.id)}
              disabled={disabled}
              className={`flex-1 rounded-md border px-2 py-2 text-xs transition-colors disabled:opacity-50 ${
                openPanelId === effect.id
                  ? 'border-cyan-700 bg-cyan-900/30 text-cyan-300'
                  : 'border-gray-700 bg-gray-900 text-gray-300'
              }`}
            >
              {effect.icon} {effect.label}
            </button>
          ) : (
            <button
              key={effect.id}
              type="button"
              onClick={() => onApply(effect.id)}
              disabled={disabled}
              className="flex-1 rounded-md border border-gray-700 bg-gray-900 px-2 py-2 text-xs text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:opacity-50"
            >
              {effect.icon} {effect.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
