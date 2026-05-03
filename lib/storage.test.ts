import { describe, it, expect, beforeEach } from 'vitest';
import { installBrowserMock } from '@/tests/helpers/chrome-api';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  saveRecordingMeta,
  getRecordingMeta,
  getAllRecordings,
  deleteRecording,
  saveAudioBlob,
  getAudioBlob,
  deleteAudioBlob,
} from './storage';
import type { RecordingMeta } from '@/types';

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
    expect(settings.waveformZoomMode).toBe(DEFAULT_SETTINGS.waveformZoomMode);
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

describe('recording metadata', () => {
  beforeEach(() => {
    installBrowserMock();
  });

  const testMeta: RecordingMeta = {
    id: 'rec-1',
    name: 'Test Recording',
    duration: 5.0,
    createdAt: Date.now(),
    sampleRate: 44100,
    channels: 1,
    size: 1024,
  };

  it('saveRecordingMeta and getRecordingMeta round-trip', async () => {
    await saveRecordingMeta(testMeta);
    const result = await getRecordingMeta('rec-1');
    expect(result).toEqual(testMeta);
  });

  it('getRecordingMeta returns null for unknown id', async () => {
    const result = await getRecordingMeta('nonexistent');
    expect(result).toBeNull();
  });

  it('getAllRecordings returns all saved recordings', async () => {
    const meta2 = { ...testMeta, id: 'rec-2', name: 'Second' };
    await saveRecordingMeta(testMeta);
    await saveRecordingMeta(meta2);
    const all = await getAllRecordings();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.id).sort()).toEqual(['rec-1', 'rec-2']);
  });

  it('getAllRecordings ignores non-rec: keys', async () => {
    const mock = installBrowserMock();
    mock.storage.local.data['settings'] = { folderName: 'X' };
    await saveRecordingMeta(testMeta);
    const all = await getAllRecordings();
    expect(all).toHaveLength(1);
  });
});

describe('audio blob storage (IndexedDB)', () => {
  it('saveAudioBlob and getAudioBlob round-trip', async () => {
    const blob = new Blob(['test audio data'], { type: 'audio/webm' });
    await saveAudioBlob('blob-1', blob);
    const result = await getAudioBlob('blob-1');
    expect(result).toBeInstanceOf(Blob);
    expect(result!.size).toBe(blob.size);
  });

  it('getAudioBlob returns null for unknown id', async () => {
    const result = await getAudioBlob('nonexistent');
    expect(result).toBeNull();
  });

  it('deleteAudioBlob removes the blob', async () => {
    const blob = new Blob(['data'], { type: 'audio/webm' });
    await saveAudioBlob('blob-del', blob);
    await deleteAudioBlob('blob-del');
    const result = await getAudioBlob('blob-del');
    expect(result).toBeNull();
  });
});

describe('deleteRecording', () => {
  beforeEach(() => {
    installBrowserMock();
  });

  it('removes both metadata and audio blob', async () => {
    const meta: RecordingMeta = {
      id: 'del-1',
      name: 'To Delete',
      duration: 1,
      createdAt: Date.now(),
      sampleRate: 44100,
      channels: 1,
      size: 100,
    };
    await saveRecordingMeta(meta);
    await saveAudioBlob('del-1', new Blob(['audio']));

    await deleteRecording('del-1');

    const metaResult = await getRecordingMeta('del-1');
    expect(metaResult).toBeNull();
    const blobResult = await getAudioBlob('del-1');
    expect(blobResult).toBeNull();
  });
});
