import type { RecordingMeta, Settings } from '@/types';

export const DEFAULT_SETTINGS: Settings = {
  folderName: 'Flih',
  preferredFormat: 'wav',
  sampleRate: 44100,
  waveformZoomMode: 'bubble',
};

const DB_NAME = 'flih-db';
const STORE_NAME = 'audio-blobs';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAudioBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveRecordingMeta(meta: RecordingMeta): Promise<void> {
  await browser.storage.local.set({ [`rec:${meta.id}`]: meta });
}

export async function getRecordingMeta(id: string): Promise<RecordingMeta | null> {
  const result = await browser.storage.local.get(`rec:${id}`);
  return (result[`rec:${id}`] as RecordingMeta) ?? null;
}

export async function getAllRecordings(): Promise<RecordingMeta[]> {
  const all = await browser.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith('rec:'))
    .map(([, value]) => value as RecordingMeta);
}

export async function deleteRecording(id: string): Promise<void> {
  await browser.storage.local.remove(`rec:${id}`);
  await deleteAudioBlob(id);
}

export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get('settings');
  const stored = (result.settings as Partial<Settings>) ?? {};
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await browser.storage.local.set({ settings: { ...current, ...settings } });
}
