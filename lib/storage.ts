import type { RecordingMeta, Settings } from '@/types';

export const DEFAULT_SETTINGS: Settings = {
  folderName: 'Flih',
  preferredFormat: 'wav',
  maxDuration: 300,
  sampleRate: 44100,
};

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  throw new Error('Not implemented');
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  throw new Error('Not implemented');
}

export async function deleteAudioBlob(id: string): Promise<void> {
  throw new Error('Not implemented');
}

export async function saveRecordingMeta(meta: RecordingMeta): Promise<void> {
  throw new Error('Not implemented');
}

export async function getRecordingMeta(id: string): Promise<RecordingMeta | null> {
  throw new Error('Not implemented');
}

export async function getAllRecordings(): Promise<RecordingMeta[]> {
  throw new Error('Not implemented');
}

export async function deleteRecording(id: string): Promise<void> {
  throw new Error('Not implemented');
}

export async function getSettings(): Promise<Settings> {
  throw new Error('Not implemented');
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  throw new Error('Not implemented');
}
