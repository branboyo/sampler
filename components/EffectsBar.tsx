import type { AudioEffect } from '@/types';

interface EffectsBarProps {
  effects: AudioEffect[];
  onApply: (effectId: string) => void;
  disabled: boolean;
}

export default function EffectsBar({
  effects,
  onApply,
  disabled,
}: EffectsBarProps) {
  return (
    <div data-testid="effects-bar" className="px-4 pt-2 pb-1">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-cw-text-secondary">
        Effects
      </div>
      <div className="flex gap-2">
        {effects.map((effect) => (
          <button
            key={effect.id}
            onClick={() => onApply(effect.id)}
            disabled={disabled}
            className="flex-1 rounded-lg border border-cw-border bg-cw-surface px-3 py-2 text-center text-xs text-cw-text-primary transition-colors hover:bg-cw-elevated disabled:opacity-50"
          >
            {effect.icon} {effect.label}
          </button>
        ))}
      </div>
    </div>
  );
}
