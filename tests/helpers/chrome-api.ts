import { vi } from 'vitest';

interface StorageArea {
  data: Record<string, unknown>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
}

export function createMockStorage(): StorageArea {
  const data: Record<string, unknown> = {};

  return {
    data,
    get: vi.fn(async (keys: string | string[] | null) => {
      if (keys === null) return { ...data };
      const keyList = typeof keys === 'string' ? [keys] : keys;
      const result: Record<string, unknown> = {};
      for (const k of keyList) {
        if (k in data) result[k] = data[k];
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(data, items);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const keyList = typeof keys === 'string' ? [keys] : keys;
      for (const k of keyList) delete data[k];
    }),
  };
}

export function createMockDownloads() {
  return {
    download: vi.fn(async () => 42),
  };
}

export function installBrowserMock() {
  const storage = createMockStorage();
  const downloads = createMockDownloads();

  const mock = {
    storage: { local: storage },
    downloads,
    runtime: {
      connect: vi.fn(() => ({
        name: 'sampler-port',
        postMessage: vi.fn(),
        onMessage: { addListener: vi.fn() },
        onDisconnect: { addListener: vi.fn() },
      })),
    },
  };

  (globalThis as Record<string, unknown>).browser = mock;
  return mock;
}
