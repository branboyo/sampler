import { describe, it, expect, beforeEach } from 'vitest';
import { installBrowserMock } from '@/tests/helpers/chrome-api';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from './storage';

describe('settings', () => {
  beforeEach(() => {
    installBrowserMock();
  });

  it('returns defaults when no settings are stored', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('merges partial stored settings with defaults', async () => {
    const mock = installBrowserMock();
    mock.storage.local.data['settings'] = { folderName: 'Custom' };
    const settings = await getSettings();
    expect(settings.folderName).toBe('Custom');
    expect(settings.preferredFormat).toBe(DEFAULT_SETTINGS.preferredFormat);
    expect(settings.sampleRate).toBe(DEFAULT_SETTINGS.sampleRate);
  });

  it('saveSettings persists partial update', async () => {
    await saveSettings({ sampleRate: 48000 });
    const settings = await getSettings();
    expect(settings.sampleRate).toBe(48000);
    expect(settings.folderName).toBe(DEFAULT_SETTINGS.folderName);
  });

  it('saveSettings merges with existing saved settings', async () => {
    await saveSettings({ folderName: 'A' });
    await saveSettings({ sampleRate: 48000 });
    const settings = await getSettings();
    expect(settings.folderName).toBe('A');
    expect(settings.sampleRate).toBe(48000);
  });
});
