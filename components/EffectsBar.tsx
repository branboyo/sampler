import type { AudioEffect } from '@/types';

interface EffectsBarProps {
  effects: AudioEffect[];
  onApply: (effectId: string) => void;
  disabled: boolean;
}

export default function EffectsBar({ effects, onApply, disabled }: EffectsBarProps) {
  return (
    <div data-testid="effects-bar" className="px-4">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-gray-500">
        Effects
      </div>
      <div className="flex gap-2">
        {effects.map((effect) => (
          <button
            key={effect.id}
            onClick={() => onApply(effect.id)}
            disabled={disabled}
            className="flex-1 rounded-md border border-gray-700 bg-gray-900 px-2 py-2 text-xs text-gray-300 disabled:opacity-50"
          >
            {effect.icon} {effect.label}
          </button>
        ))}
      </div>
    </div>
  );
}
