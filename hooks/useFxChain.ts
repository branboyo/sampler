import { useState, useCallback, useRef, useEffect } from 'react';
import type { FxChainItem, FxType, FxParams } from '@/types';
import { FX_DEFAULTS, applyFxChain } from '@/lib/fx-chain';

export function useFxChain(rawBuffer: AudioBuffer | null) {
  const [chain, setChain] = useState<FxChainItem[]>([]);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastRawRef = useRef<AudioBuffer | null>(null);

  // Reprocess immediately whenever chain or rawBuffer changes.
  // Sliders commit only on pointer/key release (see FxChain.tsx), so this
  // fires at most once per gesture — no debounce needed.
  // A cancellation flag lets a superseded run discard its result.
  useEffect(() => {
    if (!rawBuffer) {
      setProcessedBuffer(null);
      lastRawRef.current = null;
      return;
    }

    // New source recording — reset to raw immediately
    if (rawBuffer !== lastRawRef.current) {
      lastRawRef.current = rawBuffer;
      setProcessedBuffer(rawBuffer);
    }

    const enabledCount = chain.filter((i) => i.enabled).length;
    if (enabledCount === 0) {
      setProcessedBuffer(rawBuffer);
      return;
    }

    let cancelled = false;
    setIsProcessing(true);

    applyFxChain(rawBuffer, chain)
      .then((result) => {
        if (!cancelled) setProcessedBuffer(result);
      })
      .catch((err) => {
        console.error('[Flih] FX chain processing failed:', err);
        if (!cancelled) setProcessedBuffer(rawBuffer);
      })
      .finally(() => {
        if (!cancelled) setIsProcessing(false);
      });

    return () => {
      // If chain changes again before this run finishes, discard the result
      cancelled = true;
      setIsProcessing(false);
    };
  }, [rawBuffer, chain]);

  const addFx = useCallback((type: FxType) => {
    const item: FxChainItem = {
      id: crypto.randomUUID(),
      type,
      enabled: true,
      params: { ...FX_DEFAULTS[type] } as FxParams,
    };
    setChain((prev) => [...prev, item]);
  }, []);

  const removeFx = useCallback((id: string) => {
    setChain((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleFx = useCallback((id: string) => {
    setChain((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
    );
  }, []);

  const updateFxParams = useCallback((id: string, partial: Partial<FxParams>) => {
    setChain((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, params: { ...item.params, ...partial } as FxParams } : item,
      ),
    );
  }, []);

  const reorderFx = useCallback((fromIndex: number, toIndex: number) => {
    setChain((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const resetChain = useCallback(() => {
    setChain([]);
    setProcessedBuffer(null); // flush stale buffer so ?? editor.state.audioBuffer kicks in immediately
  }, []);

  return {
    chain,
    processedBuffer,
    isProcessing,
    addFx,
    removeFx,
    toggleFx,
    updateFxParams,
    reorderFx,
    resetChain,
  };
}
