import { useEffect, useState } from 'react';
import type { Settings } from '@/types';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
} from '@/lib/storage';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const updateSettings = async (partial: Partial<Settings>) => {
    await saveSettings(partial);
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return { settings, loading, updateSettings };
}
