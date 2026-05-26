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
    get: vi.fn(async (keys: string | string[] | Record<string, unknown> | null) => {
      if (keys === null) return { ...data };
      if (typeof keys === 'object' && !Array.isArray(keys)) {
        // Record<string, unknown> form — values are defaults for missing keys
        const result: Record<string, unknown> = {};
        for (const [k, defaultVal] of Object.entries(keys)) {
          result[k] = k in data ? data[k] : defaultVal;
        }
        return result;
      }
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
        disconnect: vi.fn(),
        onMessage: { addListener: vi.fn() },
        onDisconnect: { addListener: vi.fn() },
      })),
    },
  };

  (globalThis as Record<string, unknown>).browser = mock;
  return mock;
}
